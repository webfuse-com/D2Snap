#### Options

| Name | Description | Range | Default |
| :- | :- | :- | :- |
| `--provider` | Specify LLM (API) provider. | `openai`, `anthropic` | `openai` |
| `--model` | Specify LLM ('model'). | `*` | `gpt-4o` (`openai`) / `claude-sonnet-4-20250514` (`anthropic`) |
| `--split` | Delineate dataset subset. | `<size>[,<offest>]` | `∞,0` |
| `--workers` | Define worker pool size. | `<N>` | `8` |
|`--config` (_D2Snap_ only) | Specify D2Snap configuration. | `<D2Snap.C>` | all |

#### Flags

| Name | Description |
| :- | :- |
| `--verbose` | Enable console verbose logging. |