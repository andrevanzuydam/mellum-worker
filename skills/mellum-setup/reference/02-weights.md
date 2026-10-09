# Phase 2: Weights

Target folder (the name oMLX shows as the model id):

```
~/.cache/huggingface/hub/Mellum2.1-12B-A2.5B-Thinking-6bit
```

Check: that folder holds `config.json` and two `model-*.safetensors` shards.

If missing, download the published MLX 6-bit conversion into that exact
folder name:

```bash
hf download pauleveritt/Mellum2.1-12B-A2.5B-Thinking-mlx-6bit \
  --local-dir ~/.cache/huggingface/hub/Mellum2.1-12B-A2.5B-Thinking-6bit
```

About 9.9 GB. Re-run the check. If the user already has the folder under
another name, do not rename it; instead tell them the model id in phases
3 to 5 must match their folder name, and ask whether to proceed with
theirs or download under the recipe's name.
