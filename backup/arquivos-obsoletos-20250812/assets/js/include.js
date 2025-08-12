let includesLoaded = 0;

async function includeHTML(id, url) {
  const el = document.getElementById(id);
  if (el) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        el.innerHTML = await res.text();
        includesLoaded++;
        if (includesLoaded === 2) {
          // Dispara evento quando header e footer estiverem carregados
          document.dispatchEvent(new Event("includesLoaded"));
        }
      } else {
        console.warn(`Erro ao carregar ${url}: ${res.status}`);
      }
    } catch (err) {
      console.error(`Erro de rede ao incluir ${url}:`, err);
    }
  }
}

includeHTML("header-include", "header.html");
includeHTML("footer-include", "footer.html");
