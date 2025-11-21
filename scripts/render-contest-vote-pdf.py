"""Render a contest vote snapshot JSON into a simple PDF table.

Usage:
  python scripts/render-contest-vote-pdf.py path/to/snapshot.json [output.pdf]

Relies on a snapshot produced by scripts that export votes at a cutoff time.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
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


def _fallback_fixed_offset(tz_name: str) -> Optional[timezone]:
  """Fallback for environments without tzdata (common on Windows sandboxes)."""
  name = tz_name.strip().upper()
  if name in {"AFRICA/PORTO-NOVO", "PORTO-NOVO"}:
    return timezone(timedelta(hours=1))
  if name.startswith("UTC"):
    # Accept UTC+1, UTC+01:00, UTC-03 etc.
    sign = 1
    remainder = name[3:]
    if remainder.startswith("+"):
      sign = 1
      remainder = remainder[1:]
    elif remainder.startswith("-"):
      sign = -1
      remainder = remainder[1:]
    try:
      if ":" in remainder:
        hours_str, minutes_str = remainder.split(":", 1)
        hours = int(hours_str)
        minutes = int(minutes_str)
      elif remainder:
        hours = int(remainder)
        minutes = 0
      else:
        hours = 0
        minutes = 0
      return timezone(sign * timedelta(hours=hours, minutes=minutes))
    except Exception:
      return None
  return None


def format_cutoff(snapshot: Dict[str, Any]) -> Dict[str, str]:
  iso_raw = snapshot.get("cutoffLocalIso")
  if not iso_raw:
    return {"local": "n/a", "utc": "n/a"}

  cutoff = datetime.fromisoformat(str(iso_raw).replace("Z", "+00:00"))
  tz_name = snapshot.get("timezone") or "UTC"

  local_tz: Optional[timezone] = None
  try:
    local_tz = ZoneInfo(tz_name)
  except Exception:
    local_tz = _fallback_fixed_offset(tz_name)

  if local_tz:
    local_cutoff = cutoff.astimezone(local_tz)
    local_label = tz_name
  else:
    # Fallback to UTC display if we cannot resolve the timezone.
    local_cutoff = cutoff
    local_label = "UTC"

  utc_cutoff = cutoff.astimezone(timezone.utc)
  return {
    "local": f"{local_cutoff.strftime('%Y-%m-%d %H:%M')} ({local_label})",
    "utc": f"{utc_cutoff.strftime('%Y-%m-%d %H:%M')} (UTC)",
  }


def format_int(value: int) -> str:
  return f"{value:,}".replace(",", " ")


def format_percent(value: int, total: int) -> str:
  if not total:
    return "0 %"
  pct = (float(value) / float(total)) * 100
  return f"{pct:.2f}".replace(".", ",") + " %"


def build_table(snapshot: Dict[str, Any], total_votes: int) -> Table:
  rows = snapshot.get("results", [])
  header = ["#", "Candidat", "Votes @00h", "% des votes"]
  data = [header]

  for index, row in enumerate(rows, start=1):
    votes_at_cutoff = int(row.get("votesAtCutoff", 0) or 0)
    data.append(
      [
        str(index),
        row.get("name", "N/A"),
        format_int(votes_at_cutoff),
        format_percent(votes_at_cutoff, total_votes),
      ]
    )

  table = Table(
    data,
    colWidths=[12 * mm, 85 * mm, 32 * mm, 36 * mm],
    repeatRows=1,
  )

  table.setStyle(
    TableStyle(
      [
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("ALIGN", (2, 0), (3, -1), "RIGHT"),
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
  total_votes = int(snapshot.get("countedVotesAtCutoff") or 0)

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
    Paragraph("Votes concours @00h", title_style),
    Paragraph(f"ID du concours : <b>{snapshot.get('contestId', 'N/A')}</b>", subtitle_style),
    Paragraph(f"Coupe : {cutoff_str['local']} | {cutoff_str['utc']}", subtitle_style),
    Paragraph(
      f"Total des votes à 00h : {format_int(total_votes)}",
      subtitle_style,
    ),
    Paragraph(
      f"Enregistrements de votes lus : {format_int(int(snapshot.get('fetchedVotes', 0) or 0))} | "
      f"Horodatages manquants : {format_int(int(snapshot.get('missingTimestamp', 0) or 0))} | "
      f"Votes après 00h exclus : {format_int(int(snapshot.get('skippedAfterCutoff', 0) or 0))}",
      subtitle_style,
    ),
    Spacer(1, 8),
  ]

  story.append(build_table(snapshot, total_votes))
  story.append(Spacer(1, 8))
  story.append(
    Paragraph(
      f"Source : {snapshot_path.name}. PDF aligné avec le style de la liste de votes Kkiapay manquants.",
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
