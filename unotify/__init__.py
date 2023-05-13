from subprocess import call, getstatusoutput
from threading import Timer
from . import urgencies

__author__ = 'Gowixx'
BASE_COMMAND = "notify-send"


def _remove_illegal_chars(text: str):
    output = text.replace('"', '"')
    return output

def _get_urgency(number: int) -> str:
    URGENCIES = {
        1: 'low',
        2: 'normal',
        3: 'critical'
    }
    try:
        return URGENCIES[number]
    except Exception:
        return URGENCIES[2]

def _close_notification(number: int):
    call(['dbus-send',
        '--type=method_call',
        '--dest=org.freedesktop.Notifications',
        '/org/freedesktop/Notifications',
        'org.freedesktop.Notifications.CloseNotification',
        'uint32:{}'.format(number)])

def notify(
    title: str,
    message: str,
    urgency: int = None,
    id2replace: int = None,
    timeout: int = None,
    app_name: str = None,
    hint: str = None,
    app_icon: str = None,
    transient: bool = False,
    returnid: bool = False,
):
    if not urgency:
        urgency = urgencies.NORMAL

    COMMAND = f'{BASE_COMMAND}\
        "{_remove_illegal_chars(title)}"\
        "{_remove_illegal_chars(message)}"\
        -u {_get_urgency(urgency)} -p'

    if id2replace:
        COMMAND += f" -r {id2replace}"
    if app_name:
        COMMAND += f" -a {_remove_illegal_chars(app_name)}"
    if hint:
        COMMAND += f" -h {_remove_illegal_chars(hint)}"
    if app_icon:
        COMMAND += f" -i {app_icon}"
    if transient:
        COMMAND += f" -e"
    if timeout:
        COMMAND += f" -t {timeout*1000}"

    status, output = getstatusoutput(COMMAND)
    if urgency == urgencies.HIGH and timeout:
        try:
            Timer(timeout, _close_notification, args=[int(output)]).start()
        except Exception as e:
            raise Exception(e)
    if returnid:
        return output
    else:
        if status != 0:
            raise Exception(output)
        return status