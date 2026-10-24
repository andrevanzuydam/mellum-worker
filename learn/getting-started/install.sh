#!/usr/bin/env bash
set -euo pipefail

trap 'echo "[ERROR] Installation failed at line $LINENO." >&2' ERR

OS="$(uname -s)"
case "$OS" in
    Darwin|Linux) ;;
    *)
        echo "[ERROR] Only macOS and Linux are supported." >&2
        exit 1
        ;;
esac

# Also find tools installed during a previous run.
export PATH="$HOME/.local/bin:$PATH"

has() {
    command -v "$1" >/dev/null 2>&1
}

if has uv && has llama-server; then
    echo "[OK] uv and llama-server already exist."
    exit 0
fi

# Install prerequisites only if needed.
need_deps=false
has curl || need_deps=true

if ! has llama-server; then
    for tool in git make cc c++; do
        has "$tool" || need_deps=true
    done
fi

if [[ "$need_deps" == true ]]; then
    if [[ "$OS" == Darwin ]]; then
        if ! xcode-select -p >/dev/null 2>&1; then
            xcode-select --install
            echo "Finish installing Apple's Command Line Tools, then rerun."
            exit 1
        fi
    else
        SUDO=()
        if [[ "$(id -u)" -ne 0 ]]; then
            if ! has sudo; then
                echo "[ERROR] sudo is required to install build prerequisites."
                exit 1
            fi
            SUDO=(sudo)
        fi

        if has apt-get; then
            "${SUDO[@]}" apt-get update
            "${SUDO[@]}" apt-get install -y \
                curl ca-certificates git build-essential
        elif has dnf; then
            "${SUDO[@]}" dnf install -y \
                curl ca-certificates git gcc gcc-c++ make
        elif has pacman; then
            "${SUDO[@]}" pacman -S --needed --noconfirm \
                curl ca-certificates git base-devel
        else
            echo "[ERROR] Install curl, git, make, and a C/C++ compiler,"
            echo "then rerun this script."
            exit 1
        fi
    fi
fi

# Create a private workspace for downloads and compilation.
work_dir="$(mktemp -d)"
trap 'rm -rf -- "$work_dir"' EXIT

if has uv; then
    echo "[OK] uv already exists."
else
    echo "Installing uv..."
    curl -fsSL https://astral.sh/uv/install.sh \
        -o "$work_dir/install-uv.sh"

    UV_INSTALL_DIR="$HOME/.local/bin" sh "$work_dir/install-uv.sh"
    hash -r
    has uv || { echo "[ERROR] uv installation failed."; exit 1; }
fi

if has llama-server; then
    echo "[OK] llama-server already exists."
else
    for tool in git make cc c++; do
        has "$tool" || {
            echo "[ERROR] Missing build prerequisite: $tool"
            exit 1
        }
    done

    echo "Downloading llama.cpp..."
    git clone --depth 1 https://github.com/ggml-org/llama.cpp.git \
        "$work_dir/llama.cpp"

    # uv supplies CMake without a system-wide installation.
    # Static project libraries let us install the server as one executable.
    echo "Configuring llama-server..."
    uv tool run --from cmake cmake \
        -S "$work_dir/llama.cpp" \
        -B "$work_dir/build" \
        -G "Unix Makefiles" \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SHARED_LIBS=OFF \
        -DLLAMA_BUILD_TESTS=OFF \
        -DLLAMA_BUILD_SERVER=ON

    echo "Building llama-server..."
    uv tool run --from cmake cmake \
        --build "$work_dir/build" \
        --target llama-server \
        --parallel "${BUILD_JOBS:-2}"

    mkdir -p "$HOME/.local/bin"
    install -m 755 "$work_dir/build/bin/llama-server" \
        "$HOME/.local/bin/llama-server"
    hash -r
fi

echo
uv --version
llama-server --version
echo
echo "Installation complete."
echo 'For future terminals, ensure this is in your shell configuration:'
echo 'export PATH="$HOME/.local/bin:$PATH"'