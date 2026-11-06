RP="node ${RP_MJS:?set RP_MJS to skills/radical-pipelines/scripts/rp.mjs}"
newrepo() { rm -rf "$1"; mkdir -p "$1"; git -C "$1" init -q -b main; git -C "$1" config user.email t@t; git -C "$1" config user.name t; git -C "$1" config commit.gpgsign false; }
config() { # $1 dir $2 target-phase $3 base [lanes-json]
  mkdir -p "$1"; printf -- '---\n{\n  "format": 6,\n  "target-phase": %s,\n  "base": "%s"%s\n}\n---\n\n# Run configuration\n' "$2" "$3" "${4:+,
  \"lanes\": $4}" > "$1/run-config.md"; }
intent() { mkdir -p "$1/0-intent"; printf 'origin: issue 1\n\n# Title\n\n## Goal\n\nDo the thing.\n' > "$1/0-intent/intent.md"; }
