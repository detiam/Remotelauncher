#!/bin/python3
from hypercorn.config import Config as hypercornConfig
from hypercorn.middleware import AsyncioWSGIMiddleware
from hypercorn.asyncio import serve
from platform import uname
from asyncio import run
from remotelauncher import app

hypercornconfig = hypercornConfig()
match uname().system:
    case 'Linux':
        hypercornconfig.bind = ["[::]:2023"]
    case _:
        hypercornconfig.bind = ["[::]:2023", "0.0.0.0:2023"]

run(serve(AsyncioWSGIMiddleware(app, max_body_size=app.config['MAX_CONTENT_LENGTH']), hypercornconfig, mode='asgi'), debug=False)
