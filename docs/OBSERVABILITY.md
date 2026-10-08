# Observabilidade do Underleaf

O comando operacional abaixo retorna uma linha JSON sem credenciais, conteúdo
de documentos ou tokens:

```bash
make health
```

O relatório verifica:

- app web, MongoDB e Redis pelos endpoints/healthchecks internos;
- project-history, real-time e CLSI dentro do container da aplicação;
- estado do serviço `compiler`, que faz parte do stack padrão e é necessário
  para compilações;
- bytes disponíveis no volume de dados da aplicação;
- quantidade de projetos aguardando flush no project-history, quando o endpoint
  responder.

O `compiler` deve aparecer como `healthy`. Se estiver ausente, iniciando,
parado ou sem healthcheck saudável, o relatório fica `degraded` e o comando
termina com código diferente de zero. Não existe um fluxo de compilação
integrado alternativo no app: o serviço dedicado é uma dependência obrigatória.

## Logs

Os serviços usam logs Bunyan estruturados com timestamp, nível e nome do
serviço. O middleware HTTP adiciona um `requestId` gerado pelo serviço ou
valida um `X-Request-Id` recebido (`A-Za-z0-9._-`, até 128 caracteres). IDs de
usuário e projeto só aparecem nos pontos em que o logger já precisa deles para
diagnóstico.

Senhas, hashes, secrets, cookies de sessão, tokens e conteúdo de documentos
não devem ser passados a chamadas de logger. O serializer de requests mantém
somente método, URL, IP, headers operacionais e IDs de rota necessários.
