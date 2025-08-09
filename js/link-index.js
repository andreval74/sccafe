// ADDTOKEN-INDEX.JS - Só para a tela de cadastro/geração do link
import { detectContract } from './shared/contract-detector.js';

let allNetworks = [];
let selectedNetwork = null;

const rpcFallbacks = {
    97: [
        "https://data-seed-prebsc-1-s1.binance.org:8545/",
        "https://data-seed-prebsc-2-s1.binance.org:8545/",
        "https://bsc-testnet.publicnode.com",
        "https://endpoints.omniatech.io/v1/bsc/testnet/public",
        "https://bsc-testnet.public.blastapi.io"
    ],
    56: [
        "https://bsc-dataseed.binance.org",
        "https://bsc-mainnet.public.blastapi.io",
        "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
        "https://bsc.publicnode.com"
    ],
    1: [
        "https://rpc.ankr.com/eth",
        "https://mainnet.infura.io/v3/YOUR_INFURA_KEY", // Substitua se for usar Infura
        "https://cloudflare-eth.com"
    ],
    137: [
        "https://polygon-rpc.com",
        "https://polygon-mainnet.public.blastapi.io",
        "https://rpc.ankr.com/polygon"
    ]
};

function showAutocomplete() {
    const input = document.getElementById('networkSearch');
    const value = input.value.toLowerCase();
    const list = document.getElementById('networkAutocomplete');
    list.innerHTML = '';
    if (!value) {
        list.style.display = 'none';
        return;
    }
    const filtered = allNetworks.filter(n =>
        n.name.toLowerCase().includes(value) || n.chainId.toString().includes(value)
    ).slice(0, 10);
    if (filtered.length === 0) {
        list.style.display = 'none';
        return;
    }
    filtered.forEach(n => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = `${n.name} (${n.chainId})`;
        item.onclick = () => selectNetwork(n);
        list.appendChild(item);
    });
    list.style.display = 'block';
}

function selectNetwork(network) {
    selectedNetwork = network;
    document.getElementById('rpcUrl').value = network.rpc[0];
    document.getElementById('blockExplorer').value = network.explorers ? network.explorers[0].url : "";
    document.getElementById('nativeCurrency').value = network.nativeCurrency.symbol;
    document.getElementById('nativeDecimals').value = network.nativeCurrency.decimals;
    document.getElementById('networkSearch').value = `${network.name} (${network.chainId})`;
    document.getElementById('networkAutocomplete').style.display = 'none';
}

async function fetchTokenData() {
    const tokenAddress = document.getElementById('tokenAddress').value.trim();
    if (!tokenAddress) {
        alert("⚠️ Informe o endereço do token.");
        return;
    }
    if (!selectedNetwork || !selectedNetwork.rpc || selectedNetwork.rpc.length === 0) {
        alert("⚠️ Nenhuma rede selecionada.");
        return;
    }

    document.getElementById('tokenLoading').style.display = 'block';

    let rpcList = [...selectedNetwork.rpc];
    if (rpcFallbacks[selectedNetwork.chainId]) {
        rpcList = rpcList.concat(rpcFallbacks[selectedNetwork.chainId]);
    }

    let provider;
    let connected = false;

    for (let rpcUrl of rpcList) {
        try {
            provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            await provider.getNetwork();
            connected = true;
            document.getElementById('rpcUrl').value = rpcUrl;
            break;
        } catch (err) {
            // Tenta o próximo
        }
    }

    if (!connected) {
        document.getElementById('tokenLoading').style.display = 'none';
        alert("❌ Não foi possível conectar a nenhum RPC da rede selecionada.");
        return;
    }

    try {
        const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(tokenAddress, abi, provider);

        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        if (document.getElementById('tokenName')) document.getElementById('tokenName').value = name;
        document.getElementById('tokenSymbol').value = symbol;
        document.getElementById('tokenDecimals').value = decimals;

        // TrustWallet image path fix
        let networkSlug = "";
        if (selectedNetwork.slug) {
            networkSlug = selectedNetwork.slug;
        } else if (selectedNetwork.chainId === 56) {
            networkSlug = "smartchain";
        } else if (selectedNetwork.chainId === 1) {
            networkSlug = "ethereum";
        } else if (selectedNetwork.chainId === 137) {
            networkSlug = "polygon";
        } else {
            networkSlug = selectedNetwork.name.toLowerCase().replace(/\s+/g, '');
        }
        const imageUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${networkSlug}/assets/${tokenAddress}/logo.png`;

        try {
            const resp = await fetch(imageUrl, { method: "HEAD" });
            if (resp.ok) {
                document.getElementById('tokenImage').value = imageUrl;
            } else {
                document.getElementById('tokenImage').value = "";
            }
        } catch (imgErr) {
            document.getElementById('tokenImage').value = "";
        }

    } catch (err) {
        console.error(err);
        alert("❌ Erro ao buscar dados do token. Verifique se o contrato está na rede selecionada.");
    }
    document.getElementById('tokenLoading').style.display = 'none';
}

function generateLink() {
    if (!selectedNetwork || !selectedNetwork.chainId || !selectedNetwork.name) {
        alert("Selecione uma rede válida antes de gerar o link!");
        return;
    }
    // Importa gerarLinkToken do módulo centralizado
    import('./add-metamask.js').then(({ gerarLinkToken }) => {
        const data = {
            chainId: selectedNetwork.chainId,
            chainName: selectedNetwork.name,
            rpcUrl: document.getElementById('rpcUrl').value,
            blockExplorer: document.getElementById('blockExplorer').value,
            nativeCurrency: document.getElementById('nativeCurrency').value,
            nativeDecimals: document.getElementById('nativeDecimals').value,
            tokenAddress: document.getElementById('tokenAddress').value,
            tokenSymbol: document.getElementById('tokenSymbol').value,
            tokenDecimals: document.getElementById('tokenDecimals').value,
            tokenImage: document.getElementById('tokenImage').value,
            tokenName: document.getElementById('tokenName') ? document.getElementById('tokenName').value : "",
            networkName: document.getElementById('networkSearch') ? document.getElementById('networkSearch').value : ""
        };
        const link = gerarLinkToken(data);
        document.getElementById('generatedLink').value = link;
        showCopyAndShareButtons(true);
    });
}

function copyLink() {
    const textarea = document.getElementById('generatedLink');
    textarea.select();
    document.execCommand('copy');
    alert("✅ Link copiado para a área de transferência!");
}

function shareLink() {
    const link = document.getElementById('generatedLink').value;
    if (navigator.share) {
        navigator.share({ text: "Adicione este token à carteira", url: link });
    } else {
        alert("❌ Compartilhamento direto não suportado neste navegador.");
    }
}

function showCopyAndShareButtons(show) {
    const copyBtn = document.getElementById('btnCopyLink');
    const shareBtn = document.getElementById('btnShareLink');
    if (copyBtn && shareBtn) {
        if (show) {
            copyBtn.classList.remove('d-none');
            shareBtn.classList.remove('d-none');
        } else {
            copyBtn.classList.add('d-none');
            shareBtn.classList.add('d-none');
        }
    }
}

function clearForm() {
    document.getElementById('networkSearch').value = '';
    document.getElementById('rpcUrl').value = '';
    document.getElementById('blockExplorer').value = '';
    document.getElementById('nativeCurrency').value = '';
    document.getElementById('nativeDecimals').value = '';
    document.getElementById('tokenAddress').value = '';
    document.getElementById('tokenSymbol').value = '';
    document.getElementById('tokenDecimals').value = '';
    document.getElementById('tokenImage').value = '';
    if (document.getElementById('tokenName')) document.getElementById('tokenName').value = '';
    document.getElementById('generatedLink').value = '';
    showCopyAndShareButtons(false);
    document.getElementById('networkAutocomplete').style.display = 'none';
    document.getElementById('tokenLoading').style.display = 'none';
    selectedNetwork = null;
}

document.addEventListener('includesLoaded', async () => {
    if (document.getElementById('networkSearch')) {
        const res = await fetch('https://chainid.network/chains.json');
        allNetworks = await res.json();

        document.getElementById('networkSearch').addEventListener('input', showAutocomplete);
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#networkAutocomplete') && e.target.id !== 'networkSearch') {
                document.getElementById('networkAutocomplete').style.display = 'none';
            }
        });

        document.getElementById('btnTokenSearch')?.addEventListener('click', fetchTokenData);
        document.getElementById('btnGenerateLink')?.addEventListener('click', generateLink);
        document.getElementById('btnCopyLink')?.addEventListener('click', copyLink);
        document.getElementById('btnShareLink')?.addEventListener('click', shareLink);
        document.getElementById('btnClear')?.addEventListener('click', clearForm);

        document.querySelectorAll('input, textarea, select').forEach(function(el) {
            if (el.value) {
                el.classList.add('filled');
            }
        });

        showCopyAndShareButtons(false);

        const linkField = document.getElementById('generatedLink');
        linkField.addEventListener('input', function() {
            if (!linkField.value) {
                showCopyAndShareButtons(false);
            }
        });
    }
});