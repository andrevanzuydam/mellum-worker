# Backend: Ollama (not yet supported)

The recipe is backend-agnostic in principle: a prompt, seven tools, an
OpenAI-compatible endpoint, thinking on, and the sampling in the templates.
Nothing here has been run on Ollama. A port needs, in order:

1. A GGUF of `JetBrains/Mellum2.1-12B-A2.5B-Thinking` at a quantization
   that keeps the hybrid attention cache native. Note that an earlier
   llama.cpp run of the BF16 weights with thinking on exhausted a 4,096
   output cap without answering; the 16,384 cap is the first thing to set.
2. A Modelfile carrying the model's chat template, `num_ctx 56000`,
   `num_predict 16384`, temperature 1, top_p 0.95, top_k 20, and whatever
   Ollama's equivalent of forcing `enable_thinking` is at that time.
3. Confirmation that tool calls parse: a single `read` call round-trips
   through `/v1/chat/completions` with `tools` set.
4. A provider template per host pointing at `http://127.0.0.1:11434/v1`.
5. A rerun of the ladder from the `mellum-mlx` research repo against that
   endpoint, and the numbers added to the README's status table.

Until then the setup skill stops at preflight on anything but Apple
Silicon with oMLX.
