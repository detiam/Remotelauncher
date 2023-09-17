from dbus import SessionBus, Interface
from threading import Timer
from subprocess import Popen, DEVNULL
from .common import APPNAME
from os import environ, path

def openfolder(folder):
    if path.isdir(folder):
        Popen(['xdg-open', folder], stdout=DEVNULL, stderr=DEVNULL)

def notify(**kwargs):
    app_name = kwargs.get('app_name', APPNAME)
    replaces_id = kwargs.get('replaces_id', 0)
    app_icon = kwargs.get('app_icon', '')
    summary = kwargs.get('title', "title")
    body = kwargs.get('message', "body")
    actions = kwargs.get('actions', [])
    hints = kwargs.get('hints', {})
    expire_timeout = kwargs.get('timeout', -1)

    hints.update({
        "desktop-entry": APPNAME
    })
    if expire_timeout < 0:
        _expire_timeout = expire_timeout
    else:
        _expire_timeout = expire_timeout*1000

    _bus_name = 'org.freedesktop.Notifications'
    _object_path = '/org/freedesktop/Notifications'
    _interface_name = _bus_name

    session_bus = SessionBus()
    obj = session_bus.get_object(_bus_name, _object_path)
    interface = Interface(obj, _interface_name)

    notifyid = interface.Notify(
        app_name, replaces_id, app_icon,
        summary, body, actions,
        hints, _expire_timeout
    )
    if expire_timeout > 0:
        Timer(expire_timeout, interface.CloseNotification, [notifyid]).start()

    return notifyid

if environ.get('XDG_DATA_HOME') is not None:
    DATA_DIR = path.expandvars('$XDG_DATA_HOME/'+APPNAME)
else:
    DATA_DIR = path.expandvars('$HOME/.local/share/'+APPNAME)

if environ.get('TERM') is None:
    environ['TERM'] = 'dumb'

RESOURCES_DIR = path.join(DATA_DIR, 'resources')