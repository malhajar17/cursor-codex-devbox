"""Small, non-sensitive example for documentation screenshots."""


def greeting(name: str) -> str:
    """Return a friendly message for a named developer."""
    return f"Hello, {name}! Your devbox is ready."


if __name__ == "__main__":
    print(greeting("Developer"))
