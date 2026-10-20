# Mellum 2.1 on llama.cpp (Metal). Manual start — no daemon, no login loader.
#
#   just serve                       foreground, 56k ctx, BF16 weights
#   just start / stop / status       background, with a pidfile
#   just chat "explain this stack"   one-shot chat against the running server
#   just models                      GGUFs already in the HF cache
#
# 16 GB unified memory: `just start-16g` (Q4_K_M, 50k ctx, 512 batch, q8_0 KV).
# Override per run with variables: `just ctx=32000 serve` (or `just model=/path/to.gguf serve`).

port  := env("MELLUM_PORT", "8002")
host  := env("MELLUM_HOST", "127.0.0.1")
ctx   := env("MELLUM_CTX", "56000")
cache := home_directory() / ".cache/huggingface/hub"
gguf  := env("MELLUM_GGUF", cache / "Mellum2.1-12B-A2.5B-Thinking-BF16.gguf")
alias := "Mellum2.1-12B-A2.5B-Thinking"
log   := home_directory() / "Library/Logs/llamacpp-mellum.log"
pid   := "/tmp/llamacpp-mellum.pid"

# Quant used by the 16 GB recipes.
q16 := "Q4_K_M"
mt  := "16384"

# Chat template is read from the GGUF; -fa auto picks Metal flash attention.
_flags := "-np 1 -ngl 99 --jinja"

# Start in the foreground. Ctrl-C stops it.
serve ctx=ctx model=gguf *flags:
    llama-server -m {{model}} -a {{alias}} --host {{host}} --port {{port}} \
      -c {{ctx}} {{_flags}} -fa auto {{flags}}

# Foreground, sized for 16 GB unified memory (targets ~9.5 GB peak).
serve-16g *flags:
    llama-server -m {{cache}}/Mellum2.1-12B-A2.5B-Thinking-{{q16}}.gguf -a {{alias}} \
      --host {{host}} --port {{port}} -c 50000 {{_flags}} -fa auto \
      -b 512 -ub 512 -ctk q8_0 -ctv q8_0 {{flags}}

# Start in the background; waits for the model to answer, then returns.
start ctx=ctx model=gguf *flags:
    #!/usr/bin/env bash
    set -euo pipefail
    if curl -sf "http://{{host}}:{{port}}/health" >/dev/null 2>&1; then
      echo "already up on {{host}}:{{port}} (pid $(cat {{pid}} 2>/dev/null || echo '?'))"; exit 0
    fi
    mkdir -p "$(dirname '{{log}}')"
    nohup llama-server -m "{{model}}" -a "{{alias}}" --host {{host}} --port {{port}} \
      -c {{ctx}} {{_flags}} -fa auto {{flags}} > "{{log}}" 2>&1 &
    echo $! > "{{pid}}"
    echo "pid $(cat {{pid}}) → log {{log}}"
    for _ in $(seq 1 120); do
      if curl -sf "http://{{host}}:{{port}}/health" >/dev/null 2>&1; then
        echo "up on {{host}}:{{port}}"; exit 0
      fi
      sleep 1
    done
    echo "no health response after 120s — see {{log}}" >&2; exit 1

# Background, sized for 16 GB unified memory.
start-16g:
    just gguf={{cache}}/Mellum2.1-12B-A2.5B-Thinking-{{q16}}.gguf ctx=50000 start

# Stop a background server.
stop:
    #!/usr/bin/env bash
    set -uo pipefail
    if [ -f {{pid}} ] && kill "$(cat {{pid}})" 2>/dev/null; then
      echo "stopped pid $(cat {{pid}})"; rm -f {{pid}}
    else
      pkill -f "llama-server .*--port {{port}}" && echo "stopped by pattern" || echo "not running"
      rm -f {{pid}}
    fi

# Is it up, and what does it say it is?
status:
    #!/usr/bin/env bash
    set -uo pipefail
    if ! curl -sf "http://{{host}}:{{port}}/health" >/dev/null 2>&1; then
      echo "down on {{host}}:{{port}}"; exit 0
    fi
    echo "up on {{host}}:{{port}}"
    curl -sf "http://{{host}}:{{port}}/v1/models" 2>/dev/null \
      | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{for(const m of JSON.parse(d).data||[])console.log("  "+m.id)}catch{}})'
    curl -sf "http://{{host}}:{{port}}/props" 2>/dev/null \
      | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const p=JSON.parse(d);console.log("  n_ctx "+(p.default_generation_settings?.n_ctx??"?"))}catch{}})'

# One-shot chat: just chat "your prompt"
# 16384 max tokens: a thinking model can spend thousands before answering.
chat prompt max_tokens=mt:
    #!/usr/bin/env bash
    set -euo pipefail
    body=$(node -e 'console.log(JSON.stringify({messages:[{role:"user",content:process.argv[1]}],max_tokens:Number(process.argv[2]),temperature:1,top_p:0.95}))' {{quote(prompt)}} {{max_tokens}})
    curl -sS --max-time 900 "http://{{host}}:{{port}}/v1/chat/completions" \
      -H 'content-type: application/json' -d "$body" \
      | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);if(j.error){console.error(JSON.stringify(j.error));process.exit(1)}const m=j.choices[0].message;if(m.reasoning_content)console.error("[thinking] "+m.reasoning_content.slice(0,400));console.log(m.content);console.error("("+j.usage.completion_tokens+" tokens)")})'

# GGUFs already downloaded, with sizes.
models:
    @find {{cache}} -maxdepth 4 -name '*.gguf' -exec du -hL {} + 2>/dev/null | sed 's|{{cache}}/||' | sort -h | tail -20

# Fetch another quant from JetBrains: just pull Q6_K
pull quant=q16:
    hf download JetBrains/Mellum2.1-12B-A2.5B-Thinking-GGUF \
      --include "*{{quant}}.gguf" --local-dir {{cache}}

# Recent server log lines.
logs:
    tail -n 40 {{log}}
