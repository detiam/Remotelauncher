from os import environ, path, startfile
from .common import APPNAME

def openfolder(folder):
    if path.isdir(folder):
        startfile(folder)

DATA_DIR = path.join(environ['APPDATA'], APPNAME)
RESOURCES_DIR = path.join(DATA_DIR, 'resources')