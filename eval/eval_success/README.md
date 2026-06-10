## Success Rate Evaluation

``` console
npm run eval:success:<subject>
```

``` console
npm run eval:success:_summarize -- <results-date>
```

#### Subjects

| Identifier | Description |
| :- | :- |
| `gui` | Raw GUI snapshots. |
| `bu` | Grounded GUI snapshots (close to [Browser Use](https://browser-use.com)). |
| `dom` | Raw DOM snapshots (truncated at 2^15 tokens, centered in `body`). |
| `D2Snap` | _D2Snap_-downsampled DOM snapshots (different parametric configurations). |

#### Options

| Name | Description | Range | Default |
| :- | :- | :- | :- |
| `--provider` | Specify LLM (API) provider. | `openai`, `anthropic` | `openai` |
| `--model` | Specify LLM ('model'). | `*` | `gpt-4o` (`openai`) / `claude-sonnet-4-20250514` (`anthropic`) |
| `--config` (_D2Snap_ only) | Specify D2Snap configuration. | `<D2Snap.C>` | all |

#### Flags

| Name | Description |
| :- | :- |
| `--verbose` | Enable console verbose logging. |