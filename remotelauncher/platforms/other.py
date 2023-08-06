from os import path
from webbrowser import open as webopen
from .common import APPNAME

def openfolder(folder):
    if path.isdir(folder):
        webopen(folder)

DATA_DIR = path.expanduser('~/.'+APPNAME)
RESOURCES_DIR = path.join(DATA_DIR, 'resources')