import uvicorn

from neuraclaw.api import create_app
from neuraclaw.config import load_config


def main() -> None:
    config = load_config()
    uvicorn.run(create_app(), host=config.server.host, port=config.server.port)


if __name__ == "__main__":
    main()
