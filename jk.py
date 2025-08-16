import os
import zipfile

def zip_directory_with_exclusions(dir_path, zip_path, exclude_dirs=None, exclude_files=None):
    """
    Compresse un répertoire dans un fichier zip, en excluant certains dossiers et fichiers.
    """
    if exclude_dirs is None:
        exclude_dirs = []
    if exclude_files is None:
        exclude_files = []

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dir_path):
            # Exclure les dossiers spécifiés de la recherche
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                # Exclure les fichiers spécifiés
                if file not in exclude_files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, os.path.relpath(file_path, os.path.dirname(dir_path)))

# --- Utilisation du script ---

# Chemin du dossier à compresser
source_directory = 'src'

# Nom du fichier zip à créer
output_zip_file = 'src.zip'

# ======== LISTES D'EXCLUSIONS ========
# Ajoutez simplement tous les noms de dossiers et de fichiers que vous souhaitez exclure ici.
dossiers_a_exclure = [
    'dossier_a_exclure_1',
    'node_modules',
    'build',
    'tmp',
    '.git',
    '__pycache__'
]

fichiers_a_exclure = [
    'fichier_a_exclure.log',
    'debug.log',
    '.env',
    'config.local.json'
]
# ======================================

# Appel de la fonction
zip_directory_with_exclusions(
    source_directory,
    output_zip_file,
    exclude_dirs=dossiers_a_exclure,
    exclude_files=fichiers_a_exclure
)

print(f"L'archive '{output_zip_file}' a été créée avec succès !")