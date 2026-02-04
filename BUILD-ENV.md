# Build Environment Setup

**Purpose:** Document the build environment setup to avoid repeating painful dependency installation.

---

## Prerequisites

The VPS didn't have sudo access, so dependencies were installed locally.

### 1. pkg-config (from conda-forge)

```bash
mkdir -p ~/.local/bin
cd /tmp
curl -sL "https://anaconda.org/conda-forge/pkg-config/0.29.2/download/linux-64/pkg-config-0.29.2-h36c2ea0_1008.tar.bz2" -o pkg-config.tar.bz2
tar -xjf pkg-config.tar.bz2 -C ~/.local/
```

### 2. OpenSSL 3.2.0 (built from source)

```bash
cd /tmp
curl -sL https://www.openssl.org/source/openssl-3.2.0.tar.gz | tar xz
cd openssl-3.2.0
./Configure --prefix=$HOME/.local --openssldir=$HOME/.local/ssl no-shared linux-x86_64
make -j4
make install_sw

# Create pkgconfig files
mkdir -p ~/.local/lib/pkgconfig

cat > ~/.local/lib/pkgconfig/openssl.pc << 'EOF'
prefix=/home/clawd/.local
exec_prefix=${prefix}
libdir=${exec_prefix}/lib
includedir=${prefix}/include

Name: OpenSSL
Description: Secure Sockets Layer and cryptography libraries
Version: 3.2.0
Libs: -L${libdir} -lssl -lcrypto -ldl -lpthread
Cflags: -I${includedir}
EOF

cat > ~/.local/lib/pkgconfig/libssl.pc << 'EOF'
prefix=/home/clawd/.local
exec_prefix=${prefix}
libdir=${exec_prefix}/lib
includedir=${prefix}/include

Name: OpenSSL-libssl
Description: Secure Sockets Layer and cryptography libraries
Version: 3.2.0
Requires.private: libcrypto
Libs: -L${libdir} -lssl
Cflags: -I${includedir}
EOF

cat > ~/.local/lib/pkgconfig/libcrypto.pc << 'EOF'
prefix=/home/clawd/.local
exec_prefix=${prefix}
libdir=${exec_prefix}/lib
includedir=${prefix}/include

Name: OpenSSL-libcrypto
Description: OpenSSL cryptography library
Version: 3.2.0
Libs: -L${libdir} -lcrypto -ldl -lpthread
Cflags: -I${includedir}
EOF
```

### 3. libudev (header + symlink)

```bash
# Get header file
mkdir -p ~/.local/include
curl -sL "https://raw.githubusercontent.com/systemd/systemd/main/src/libudev/libudev.h" -o ~/.local/include/libudev.h

# Create symlink to system library
ln -sf /usr/lib/x86_64-linux-gnu/libudev.so.1 ~/.local/lib/libudev.so

# Create pkgconfig
cat > ~/.local/lib/pkgconfig/libudev.pc << 'EOF'
prefix=/home/clawd/.local
exec_prefix=${prefix}
libdir=${prefix}/lib
includedir=${prefix}/include

Name: libudev
Description: Library to access udev device information
Version: 256
Libs: -L${libdir} -ludev
Cflags: -I${includedir}
EOF
```

---

## Environment Variables

Add to `~/.bashrc` or run before building:

```bash
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:/home/clawd/.local/share/solana/install/active_release/bin:$PATH"
export PKG_CONFIG_PATH="$HOME/.local/lib/pkgconfig"
export LD_LIBRARY_PATH="$HOME/.local/lib"
export OPENSSL_STATIC=1
export OPENSSL_LIB_DIR="$HOME/.local/lib"
export OPENSSL_INCLUDE_DIR="$HOME/.local/include"
export CFLAGS="-I$HOME/.local/include"
export CPATH="$HOME/.local/include"
export LIBRARY_PATH="$HOME/.local/lib"
```

---

## Tool Versions

| Tool | Version | Install Command |
|------|---------|-----------------|
| Rust | 1.93.0 (stable) | `rustup default stable` |
| Solana CLI | 3.0.13 | `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"` |
| Anchor CLI | 0.31.0 | `cargo install anchor-cli --version 0.31.0` |
| Node.js | v22.22.0 | Pre-installed |
| Platform-tools | v1.52 | Auto-downloaded by cargo-build-sbf |

---

## Building Solana Programs

**Critical:** Must use platform-tools v1.52+ because crates.io has blake3 v1.8.3 which requires Rust edition 2024. Older platform-tools use Cargo 1.84 which doesn't support edition2024.

```bash
# Build each program with v1.52
cd agent-news-wire/programs

cargo-build-sbf --tools-version v1.52 --manifest-path subscription/Cargo.toml
cargo-build-sbf --tools-version v1.52 --manifest-path alerts/Cargo.toml
cargo-build-sbf --tools-version v1.52 --manifest-path publisher/Cargo.toml

# Output in target/deploy/
ls target/deploy/*.so
```

---

## Installing Anchor CLI (if needed)

Anchor 0.31.0 requires OpenSSL and libudev. With the above setup:

```bash
source "$HOME/.cargo/env"
export PATH="$HOME/.local/bin:$PATH"
export PKG_CONFIG_PATH="$HOME/.local/lib/pkgconfig"
export OPENSSL_STATIC=1
export OPENSSL_LIB_DIR="$HOME/.local/lib"
export OPENSSL_INCLUDE_DIR="$HOME/.local/include"
export LIBRARY_PATH="$HOME/.local/lib"
export LD_LIBRARY_PATH="$HOME/.local/lib"

cargo install anchor-cli --version 0.31.0
```

---

## Common Issues

### "feature `edition2024` is required"
Use `--tools-version v1.52` with cargo-build-sbf.

### "lock file version 4 requires `-Znext-lockfile-bump`"
Delete `Cargo.lock` and rebuild. Caused by mixing Cargo versions.

### "unable to find library -ludev"
Ensure libudev symlink exists: `ln -sf /usr/lib/x86_64-linux-gnu/libudev.so.1 ~/.local/lib/libudev.so`

### OpenSSL not found
Check PKG_CONFIG_PATH includes `~/.local/lib/pkgconfig`

---

*This environment is already set up on the VPS. Only needed if rebuilding from scratch.*
