# Gerenciador de rendimentos

Aplicação web para calcular projeções futuras e simular quanto um valor teria rendido em períodos passados.

## Estado atual

Nesta versão, a aplicação:

- recebe valor inicial
- recebe aporte mensal
- permite sobrescrever aportes em meses específicos
- permite projeção manual com taxa mensal e período em meses
- permite simulação histórica com Selic ou poupança
- compara lado a lado taxa manual, Selic histórica e poupança histórica
- calcula total investido, juros ganhos e montante final
- exibe a evolução mês a mês
- exibe gráfico da evolução acumulada do saldo
- permite exportar a tabela detalhada em CSV
- salva os últimos dados preenchidos no navegador

## Como rodar

Como o projeto atual é uma aplicação estática com JavaScript em módulo, o jeito mais confiável de executar é servir a pasta `src/` por HTTP local.

### Opção com Python

Na raiz do projeto, execute:

```powershell
python -m http.server 8000 -d src
```

Depois abra:

```text
http://localhost:8000
```

### Opção com Node

Na raiz do projeto, execute:

```powershell
npx serve src
```

Depois abra a URL exibida no terminal.

## Como rodar os testes

Os testes atuais validam a lógica principal de cálculo manual, o motor genérico por taxas mensais e a regra da poupança.

Execute na raiz do projeto:

```powershell
node --test --test-isolation=none tests\calculation.test.js tests\validation.test.js tests\contribution-plan.test.js tests\number-input.test.js tests\storage.test.js
```

O parâmetro `--test-isolation=none` é usado porque, neste ambiente, o isolamento padrão do runner do Node tenta abrir subprocessos e pode falhar.

## Integração contínua

O repositório possui CI com GitHub Actions em [`.github/workflows/ci.yml`](/C:/Projects/Gerenciador%20de%20rendimentos/.github/workflows/ci.yml).

Esse workflow roda automaticamente em `push` e `pull_request` para a branch `main` e executa:

- checkout do repositório
- configuração do Node.js
- execução de `node --test tests/calculation.test.js tests/validation.test.js tests/contribution-plan.test.js tests/number-input.test.js`

No GitHub Actions, o runner padrão consegue executar o comando de teste sem o parâmetro `--test-isolation=none`.

## Versionamento

O projeto segue `Semantic Versioning` no formato `MAJOR.MINOR.PATCH`.

Regras adotadas:

- `MAJOR`: mudanças incompatíveis ou quebra relevante de contrato
- `MINOR`: novas funcionalidades compatíveis com a versão atual
- `PATCH`: correções e ajustes sem mudança funcional relevante

Enquanto o projeto ainda estiver amadurecendo, a linha `0.x.y` será usada.
O primeiro marco base planejado é `v0.1.0`.

O histórico de mudanças fica em [`CHANGELOG.md`](/C:/Projects/Gerenciador%20de%20rendimentos/CHANGELOG.md).

Exemplo para criar uma tag de versão:

```powershell
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## Estrutura atual

```text
src/
  index.html
  styles.css
  app.js
  calculation.js
  historical-data.js
  lib/
    formatters.js
    storage.js
    validation.js
  ui/
    view.js
tests/
  calculation.test.js
  contribution-plan.test.js
  number-input.test.js
  storage.test.js
  validation.test.js
```

## Modos de cálculo

### Projeção manual

Use quando quiser estimar um cenário futuro com:

- taxa mensal fixa
- número de meses
- aporte mensal constante
- opção de aportes personalizados no formato `mês:valor`, por exemplo `1:1000`

### Simulação histórica

Use quando quiser estimar quanto um valor teria rendido entre um mês inicial e um mês final.

Bases disponíveis:

- `Selic histórica`
- `Poupança histórica`

Observações:

- a simulação histórica consulta séries oficiais do Banco Central em tempo de execução
- a poupança é estimada por mês com `TR + regra da Selic`
- para a poupança histórica, a consulta fica limitada a 10 anos por causa da série diária da TR
- se a consulta ao Banco Central falhar, a simulação histórica não será concluída
- na comparação histórica, a taxa manual usa a mesma quantidade de meses do intervalo selecionado
- no modo histórico, aportes personalizados usam o formato `AAAA-MM:valor`, por exemplo `2026-03:1200`

## Manutenção do README

Sempre que a forma de executar, testar, configurar ou publicar o projeto mudar, atualize este arquivo junto com a mudança.

## Checklist rápido de validação manual

1. Rodar a aplicação localmente por HTTP.
2. Testar uma projeção manual e verificar se a tabela mês a mês aparece.
3. Testar a exportação CSV e abrir o arquivo gerado.
4. Testar uma simulação histórica com Selic.
5. Testar uma simulação histórica com poupança.
6. Confirmar que a comparação lado a lado aparece no modo histórico.
7. Confirmar que campos inválidos exibem mensagens de erro antes do cálculo.
