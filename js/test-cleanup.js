// Teste rápido de funções essenciais
console.log('🧪 Testando funções essenciais...');

// Teste de função básica do network-manager
if (typeof detectCurrentNetwork !== 'undefined') {
  console.log('✅ detectCurrentNetwork está disponível');
} else {
  console.log('❌ detectCurrentNetwork não encontrada');
}

// Teste de função básica do add-utils
if (typeof marcarConcluido !== 'undefined') {
  console.log('✅ marcarConcluido está disponível');
} else {
  console.log('❌ marcarConcluido não encontrada');
}

// Teste de objeto currentNetwork
if (typeof currentNetwork !== 'undefined') {
  console.log('✅ currentNetwork está disponível');
} else {
  console.log('❌ currentNetwork não encontrada');
}

console.log('🧪 Teste concluído');
