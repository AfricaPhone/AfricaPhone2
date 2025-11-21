"""Render a contest vote snapshot JSON into a simple PDF table.

Usage:
  python scripts/render-contest-vote-pdf.py path/to/snapshot.json [output.pdf]

Relies on a snapshot produced by scripts that export votes at a cutoff time.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def load_snapshot(path: Path) -> Dict[str, Any]:
  data = json.loads(path.read_text(encoding="utf-8"))
  if "results" not in data or not isinstance(data["results"], list):
    raise ValueError("Snapshot is missing a results array.")
  return data


def format_cutoff(snapshot: Dict[str, Any]) -> Dict[str, str]:
  iso_raw = snapshot.get("cutoffLocalIso")
  if not iso_raw:
    return {"local": "n/a", "utc": "n/a"}

  cutoff = datetime.fromisoformat(str(iso_raw).replace("Z", "+00:00"))
  tz_name = snapshot.get("timezone") or "UTC"
  try:
    local_tz = ZoneInfo(tz_name)
    local_cutoff = cutoff.astimezone(local_tz)
  except Exception:
    # Fallback to naive display if zoneinfo is unavailable or invalid.
    local_cutoff = cutoff
    local_tz = None

  utc_cutoff = cutoff.astimezone(timezone.utc)
  local_label = tz_name if local_tz else "Local"
  return {
    "local": f"{local_cutoff.strftime('%Y-%m-%d %H:%M')} ({local_label})",
    "utc": f"{utc_cutoff.strftime('%Y-%m-%d %H:%M')} (UTC)",
  }


def build_table(snapshot: Dict[str, Any]) -> Table:
  rows = snapshot.get("results", [])
  header = ["#", "Candidate", "Votes @00h", "Current total", "Candidate ID"]
  data = [header]

  for index, row in enumerate(rows, start=1):
    data.append(
      [
        str(index),
        row.get("name", "N/A"),
        f"{row.get('votesAtCutoff', 0):,}".replace(",", " "),
        "-" if row.get("currentVoteCount") is None else f"{row['currentVoteCount']:,}".replace(",", " "),
        row.get("candidateId", "N/A"),
      ]
    )

  table = Table(
    data,
    colWidths=[12 * mm, 68 * mm, 28 * mm, 32 * mm, 52 * mm],
    repeatRows=1,
  )

  table.setStyle(
    TableStyle(
      [
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("ALIGN", (2, 0), (3, -1), "RIGHT"),
        ("ALIGN", (4, 1), (4, -1), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
      ]
    )
  )
  return table


def render_pdf(snapshot_path: Path, output_path: Path) -> None:
  snapshot = load_snapshot(snapshot_path)
  cutoff_str = format_cutoff(snapshot)

  styles = getSampleStyleSheet()
  title_style = ParagraphStyle(
    "Title",
    parent=styles["Heading1"],
    fontSize=16,
    leading=18,
    spaceAfter=6,
  )
  subtitle_style = ParagraphStyle(
    "Subtitle",
    parent=styles["Normal"],
    fontSize=10,
    leading=13,
    spaceAfter=2,
  )
  note_style = ParagraphStyle(
    "Note",
    parent=styles["Normal"],
    fontSize=9,
    leading=12,
    textColor="#444444",
  )

  doc = SimpleDocTemplate(
    str(output_path),
    pagesize=A4,
    rightMargin=16 * mm,
    leftMargin=16 * mm,
    topMargin=18 * mm,
    bottomMargin=18 * mm,
  )

  story = [
    Paragraph("Contest votes @00h snapshot", title_style),
    Paragraph(f"Contest ID: <b>{snapshot.get('contestId', 'N/A')}</b>", subtitle_style),
    Paragraph(f"Cutoff: {cutoff_str['local']} | {cutoff_str['utc']}", subtitle_style),
    Paragraph(
      f"Total votes @00h: {snapshot.get('countedVotesAtCutoff', 0):,}".replace(",", " "),
      subtitle_style,
    ),
    Paragraph(
      f"Fetched vote records: {snapshot.get('fetchedVotes', 0)} | "
      f"Missing timestamp: {snapshot.get('missingTimestamp', 0)} | "
      f"Skipped after cutoff: {snapshot.get('skippedAfterCutoff', 0)}",
      subtitle_style,
    ),
    Paragraph(f"Generated at: {snapshot.get('generatedAt', 'N/A')}", subtitle_style),
    Spacer(1, 8),
  ]

  story.append(build_table(snapshot))
  story.append(Spacer(1, 8))
  story.append(
    Paragraph(
      f"Source: {snapshot_path.name}. This PDF is intended to mirror the missing-KkiaPay audit list style.",
      note_style,
    )
  )

  doc.build(story)


def main(argv: list[str]) -> None:
  if len(argv) < 2:
    print("Usage: python scripts/render-contest-vote-pdf.py input.json [output.pdf]")
    sys.exit(1)

  snapshot_path = Path(argv[1])
  if not snapshot_path.exists():
    print(f"Snapshot not found: {snapshot_path}")
    sys.exit(1)

  if len(argv) >= 3:
    output_path = Path(argv[2])
  else:
    output_path = snapshot_path.with_suffix(".pdf")

  render_pdf(snapshot_path, output_path)
  print(f"Rendered PDF: {output_path}")


if __name__ == "__main__":
  main(sys.argv)
