from platform import uname
from .common import APPNAME, CONFIGNAMES, askdirectory

match uname().system:
    case 'Windows':
        from .windows import openfolder, DATA_DIR, RESOURCES_DIR
        from .common import notify
    case 'Linux':
        from .linux import openfolder, notify, DATA_DIR, RESOURCES_DIR
    case _:
        from .other import openfolder, DATA_DIR, RESOURCES_DIR
        from .common import notify
