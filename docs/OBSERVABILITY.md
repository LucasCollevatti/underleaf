# Observabilidade do Underleaf

O comando operacional abaixo retorna uma linha JSON sem credenciais, conteúdo
de documentos ou tokens:

```bash
make health
```

O relatório verifica:

- app web, MongoDB e Redis pelos endpoints/healthchecks internos;
- project-history, real-time e CLSI dentro do container da aplicação;
- estado do serviço `compiler` quando o perfil `compiler` estiver iniciado;
- bytes disponíveis no volume de dados da aplicação;
- quantidade de projetos aguardando flush no project-history, quando o endpoint
  responder.

Quando o perfil de compiler não está ativo, `compiler` aparece como
`not_started`; isso não degrada o stack local, que ainda possui o fluxo de
compilação integrado. Um compiler iniciado e sem healthcheck saudável torna o
relatório `degraded`.

## Logs

Os serviços usam logs Bunyan estruturados com timestamp, nível e nome do
serviço. O middleware HTTP adiciona um `requestId` gerado pelo serviço ou
valida um `X-Request-Id` recebido (`A-Za-z0-9._-`, até 128 caracteres). IDs de
usuário e projeto só aparecem nos pontos em que o logger já precisa deles para
diagnóstico.

Senhas, hashes, secrets, cookies de sessão, tokens e conteúdo de documentos
não devem ser passados a chamadas de logger. O serializer de requests mantém
somente método, URL, IP, headers operacionais e IDs de rota necessários.
