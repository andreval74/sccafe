# 🚀 GUIA RÁPIDO - TESTE DE COMPATIBILIDADE

## ⚠️ PROBLEMA IDENTIFICADO

O erro "missing trie node" indica que o contrato não foi deployado corretamente ou o endereço está errado.

## 🛠️ SOLUÇÃO PASSO A PASSO

### 1. **Deploy o Novo Contrato Simplificado**

Use o arquivo `token-simples.sol` que é mais robusto:

1. Abra <https://remix.ethereum.org/>
2. Crie arquivo `SCCAFETokenSimple.sol`
3. Cole o código do `token-simples.sol`
4. Compile com Solidity 0.8.19+
5. Deploy na BSC Testnet (sem parâmetros no construtor)
6. **COPIE O ENDEREÇO CORRETO APÓS CONFIRMAÇÃO**

### 2. **Configurações Otimizadas**

O novo contrato tem:

- ✅ Compra mínima: **0.0005 BNB** (muito baixa para testes)
- ✅ Preço: **0.001 BNB por token**
- ✅ Venda sempre ativa
- ✅ Nunca pausado
- ✅ 1 milhão de tokens prontos

### 3. **Como Testar Corretamente**

1. **Aguarde confirmação completa** do deploy (vários blocos)
2. **Verifique o endereço** no BSCScan testnet
3. **Cole o endereço correto** no teste
4. Use valores de teste maiores: **0.001 BNB ou mais**

### 4. **Checklist Antes de Testar**

- [ ] MetaMask na BSC Testnet (Chain ID 97)
- [ ] Contrato deployado e confirmado
- [ ] Endereço correto copiado
- [ ] BNB suficiente para gas
- [ ] Aguardou confirmação na blockchain

### 5. **Valores de Teste Recomendados**

```javascript
// Use estes valores no teste:
const testValue = "0.001"; // 0.001 BNB
// Ou maior se preferir:
const testValue = "0.01";  // 0.01 BNB
```

### 6. **Se Ainda Não Funcionar**

1. **Verifique a rede**: BSC Testnet (97)
2. **Confirme o deploy**: BSCScan Testnet
3. **Teste com valores maiores**: 0.01 BNB
4. **Aguarde mais blocos**: As vezes demora

### 7. **Exemplo de Endereço Válido**

Um endereço válido tem este formato:

```text
0x1234567890abcdef1234567890abcdef12345678
```

**NÃO use endereços de exemplo ou de outros contratos!**

---

## 🎯 RESULTADO ESPERADO

Com o contrato simplificado, você deve ver:

```text
✅ Contrato detectado no endereço: 0x...
✅ Token: SCCAFE Simple Token (SCSIMPLE) - 18 decimais
✅ Preço: 0.001 BNB
✅ Limites: 0.0005 - 1.0 BNB
✅ Venda ativa e não pausado
✅ Função buy() funcional
✅ CallStatic funcionou perfeitamente
🎯 RESULTADO FINAL: 100% de compatibilidade
```
