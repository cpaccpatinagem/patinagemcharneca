/* ==========================================================================
   CPACC — Interações e animações
   Sem dependências. Tudo respeita prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1. Header — encolhe ao scroll e esconde-se ao descer
     ------------------------------------------------------------------ */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;
    var last = 0;
    var menu = $("[data-menu]");

    onScroll(function (y) {
      header.classList.toggle("is-stuck", y > 40);

      var menuOpen = menu && menu.classList.contains("is-open");
      var goingDown = y > last && y > 300;
      header.classList.toggle("is-hidden", goingDown && !menuOpen);
      last = y;
    });
  }

  /* ------------------------------------------------------------------
     2. Menu móvel
     ------------------------------------------------------------------ */
  function initMenu() {
    var burger = $("[data-burger]");
    var menu = $("[data-menu]");
    if (!burger || !menu) return;

    var links = $$("a", menu);

    function setOpen(open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      if (open) {
        $("[data-header]").classList.remove("is-hidden");
        // O foco entra no menu depois de a cortina abrir; sem isto o Tab
        // continuava a percorrer a página escondida por baixo.
        setTimeout(function () { if (links[0]) links[0].focus(); }, reduceMotion ? 0 : 200);
      }
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });

    links.forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;

      if (e.key === "Escape") {
        setOpen(false);
        burger.focus();
        return;
      }

      // Enquanto o menu está aberto, o Tab anda em ciclo entre o botão e
      // os links do menu, e nunca sai para o conteúdo tapado.
      if (e.key === "Tab") {
        var ring = [burger].concat(links);
        var i = ring.indexOf(document.activeElement);
        if (i === -1) { e.preventDefault(); ring[0].focus(); return; }
        if (e.shiftKey && i === 0) { e.preventDefault(); ring[ring.length - 1].focus(); }
        else if (!e.shiftKey && i === ring.length - 1) { e.preventDefault(); ring[0].focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------
     3. Revelação ao scroll — fade + translate, com escalonamento
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    // Escalonamento automático dentro de contentores marcados
    $$("[data-stagger]").forEach(function (group) {
      var step = parseInt(group.getAttribute("data-stagger"), 10) || 90;
      $$("[data-reveal]", group).forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", i * step + "ms");
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     4. Contadores animados
     ------------------------------------------------------------------ */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;

    // Contadores "desde uma data" (data-since="1999-10-28") calculam os anos
    // completos até hoje, para não ser preciso mudar o número a cada época.
    // O valor escrito no HTML fica como reserva para quem não tem JS.
    nums.forEach(function (el) {
      var since = el.getAttribute("data-since");
      if (!since) return;
      var start = new Date(since);
      var now = new Date();
      var years = now.getFullYear() - start.getFullYear();
      var beforeAnniversary = now.getMonth() < start.getMonth()
        || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
      if (beforeAnniversary) years -= 1;
      el.setAttribute("data-count", String(years));
      el.textContent = (el.getAttribute("data-prefix") || "") + years + (el.getAttribute("data-suffix") || "");
    });

    // O HTML traz o valor real (para leitores de ecrã, motores de busca e
    // quem não tem JS). Só se vai animar é que se parte do zero.
    if (!reduceMotion && "IntersectionObserver" in window) {
      nums.forEach(function (el) {
        el.textContent = (el.getAttribute("data-prefix") || "") + "0";
      });
    }

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) { el.textContent = prefix + target + suffix; return; }

      var dur = 1600;
      var t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = prefix + Math.round(target * eased) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     5. Parallax do hero + esbatimento do conteúdo
     ------------------------------------------------------------------ */
  function initHeroParallax() {
    var hero = $("[data-hero]");
    if (!hero || reduceMotion) return;

    var media = $("[data-hero-media]", hero);
    var content = $("[data-hero-content]", hero);
    var small = window.matchMedia("(max-width: 767px)");

    onScroll(function (y) {
      // Em ecrãs pequenos o scroll do sistema já tem inércia própria; o
      // parallax ficava a lutar com ela. Limpa-se o que possa ter ficado
      // de uma largura maior.
      if (small.matches) {
        if (media) media.style.transform = "";
        if (content) { content.style.transform = ""; content.style.opacity = ""; }
        return;
      }
      var h = hero.offsetHeight;
      if (y > h) return;
      var p = y / h;
      if (media) media.style.transform = "translate3d(0," + (y * 0.32) + "px,0) scale(" + (1 + p * 0.06) + ")";
      if (content) {
        content.style.transform = "translate3d(0," + (y * 0.14) + "px,0)";
        content.style.opacity = String(Math.max(0, 1 - p * 1.5));
      }
      hero.classList.toggle("is-scrolled", y > 60);
    });
  }

  /* ------------------------------------------------------------------
     6. Brilho dourado que segue o rato nos cartões
     ------------------------------------------------------------------ */
  function initCardGlow() {
    if (reduceMotion || window.matchMedia("(hover: none)").matches) return;
    $$(".card, .slot").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ------------------------------------------------------------------
     7. Acordeão de FAQ
     ------------------------------------------------------------------ */
  function initFaq() {
    var uid = 0;

    function panelOf(btn) { return btn.nextElementSibling; }

    function setOpen(btn, open) {
      var panel = panelOf(btn);
      var inner = panel.firstElementChild;
      btn.setAttribute("aria-expanded", String(open));

      if (reduceMotion) {
        panel.classList.toggle("is-open", open);
        panel.style.height = open ? "auto" : "0px";
        return;
      }

      if (open) {
        panel.classList.add("is-open");
        panel.style.height = inner.offsetHeight + "px";
        // depois da transição, "auto" para acompanhar mudanças de largura
        panel.addEventListener("transitionend", function done(e) {
          if (e.propertyName !== "height") return;
          panel.style.height = "auto";
          panel.removeEventListener("transitionend", done);
        });
      } else {
        // De "auto" para um valor fixo antes de fechar, senão não há o que animar.
        // O void força o recálculo de layout, para que a transição arranque
        // a partir da altura real e não do valor anterior.
        panel.style.height = panel.scrollHeight + "px";
        void panel.offsetHeight;
        panel.classList.remove("is-open");
        panel.style.height = "0px";
      }
    }

    $$("[data-faq] .faq__q").forEach(function (btn) {
      var panel = panelOf(btn);
      if (!panel) return;

      // Liga botão e painel para leitores de ecrã
      if (!panel.id) panel.id = "faq-painel-" + (++uid);
      btn.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btn.id || (btn.id = "faq-pergunta-" + uid));

      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        var group = btn.closest("[data-faq]");

        // mantém apenas uma resposta aberta de cada vez
        if (!open && group) {
          $$(".faq__q[aria-expanded='true']", group).forEach(function (other) {
            setOpen(other, false);
          });
        }
        setOpen(btn, !open);
      });
    });

    // Se a janela mudar de largura, o painel aberto reajusta-se sozinho
    // porque fica em height:auto — nada a fazer aqui.
  }

  /* ------------------------------------------------------------------
     7b. Linha do percurso — desenha-se com o scroll
     ------------------------------------------------------------------ */
  function initPathLine() {
    var path = $("[data-path]");
    if (!path) return;
    if (reduceMotion) { path.style.setProperty("--path-p", "1"); return; }

    onScroll(function () {
      var r = path.getBoundingClientRect();
      var vh = window.innerHeight;
      // Começa quando o topo passa os 85% do ecrã; acaba ao fim de uma
      // distância nunca maior do que 60% do ecrã, para não arrastar.
      var span = Math.min(r.height, vh * 0.6);
      var p = (vh * 0.85 - r.top) / span;
      path.style.setProperty("--path-p", String(Math.min(1, Math.max(0, p))));
    });
  }

  /* ------------------------------------------------------------------
     7c. Brilho único nos botões dourados quando entram no ecrã
     ------------------------------------------------------------------ */
  function initShine() {
    var btns = $$(".btn--gold");
    if (!btns.length || reduceMotion || !("IntersectionObserver" in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        // Espera que a entrada do botão termine antes de brilhar
        setTimeout(function () { entry.target.classList.add("is-shine"); }, 700);
      });
    }, { threshold: 0.9 });

    btns.forEach(function (b) { io.observe(b); });
  }

  /* ------------------------------------------------------------------
     8. Barra de progresso de leitura
     ------------------------------------------------------------------ */
  function initProgress() {
    var bar = $("[data-progress]");
    if (!bar) return;
    onScroll(function (y) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    });
  }

  /* ------------------------------------------------------------------
     9. Vídeo do hero — som e pausa quando fora de vista
     ------------------------------------------------------------------ */
  function initHeroVideo() {
    var video = $("[data-hero-video]");
    if (!video) return;

    // Com poupança de dados ativa não se descarrega vídeo: fica o poster,
    // que o CSS anima com Ken Burns.
    var conn = navigator.connection;
    if (conn && conn.saveData && video.poster) {
      var still = document.createElement("img");
      still.src = video.poster;
      still.alt = "";
      video.replaceWith(still);
      var t = $("[data-sound-toggle]");
      if (t) t.hidden = true;
      return;
    }

    var toggle = $("[data-sound-toggle]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        video.muted = !video.muted;
        toggle.setAttribute("aria-pressed", String(!video.muted));
        toggle.setAttribute("aria-label", video.muted ? "Ativar som do vídeo" : "Desativar som do vídeo");
        $$("[data-icon-on], [data-icon-off]", toggle).forEach(function (i) {
          i.hidden = !i.hidden;
        });
      });
    }

    // Poupa bateria: pausa quando o hero sai do ecrã
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { video.play().catch(function () {}); }
          else { video.pause(); }
        });
      }, { threshold: 0.05 }).observe(video);
    }
  }

  /* ------------------------------------------------------------------
     10. Formulário de pré-inscrição
     ------------------------------------------------------------------ */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;

    var success = $("[data-form-success]");
    var submit = $("[data-form-submit]", form);

    // Limites da data de nascimento relativos ao ano corrente, para não
    // ficarem presos à época em que o formulário foi escrito. Os atributos
    // no HTML são a reserva para quem não tem JS.
    var nascimento = $("[name='nascimento']", form);
    if (nascimento) {
      var ano = new Date().getFullYear();
      nascimento.min = (ano - 21) + "-01-01";
      nascimento.max = (ano - 3) + "-12-31";
    }

    function fieldOf(input) { return input.closest(".field, .consent-field"); }

    function messageFor(input) {
      if (input.validity.valueMissing) {
        return input.type === "checkbox" ? "É necessário aceitar para continuar." : "Este campo é obrigatório.";
      }
      if (input.validity.typeMismatch && input.type === "email") return "Introduza um email válido.";
      if (input.validity.patternMismatch && input.name === "telefone") return "Introduza um número de telemóvel válido (9 dígitos).";
      if (input.validity.rangeUnderflow || input.validity.rangeOverflow) return "Verifique a data introduzida.";
      return "Verifique este campo.";
    }

    function validate(input) {
      var wrap = fieldOf(input);
      if (!wrap) return input.checkValidity();
      var ok = input.checkValidity();
      wrap.classList.toggle("has-error", !ok);
      var msg = $(".error-msg", wrap);
      if (msg) msg.textContent = ok ? "" : messageFor(input);
      input.setAttribute("aria-invalid", String(!ok));
      return ok;
    }

    $$("input, select, textarea", form).forEach(function (input) {
      input.addEventListener("blur", function () {
        if (input.value !== "" || input.required) validate(input);
      });
      input.addEventListener("input", function () {
        var wrap = fieldOf(input);
        if (wrap && wrap.classList.contains("has-error")) validate(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: se estiver preenchido, é um bot — fingimos sucesso.
      var hp = $(".hp input", form);
      if (hp && hp.value) { showSuccess(); return; }

      var fields = $$("input, select, textarea", form).filter(function (i) {
        return !i.closest(".hp");
      });
      var firstBad = null;
      fields.forEach(function (input) {
        if (!validate(input) && !firstBad) firstBad = input;
      });

      if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        return;
      }

      send();
    });

    function send() {
      submit.setAttribute("aria-busy", "true");
      var original = submit.innerHTML;
      submit.innerHTML = "A enviar…";

      var endpoint = form.getAttribute("data-endpoint");
      var data = new FormData(form);

      // Sem serviço de receção configurado: entregamos por email em vez de
      // fingir que enviámos. Abre o cliente de email do visitante já preenchido,
      // para que a pré-inscrição chegue mesmo ao clube e nada se perca.
      if (!endpoint || endpoint.indexOf("SUBSTITUIR") !== -1) {
        var rotulos = {
          atleta: "Atleta",
          nascimento: "Data de nascimento",
          encarregado: "Encarregado de educação",
          telefone: "Telemóvel",
          email: "Email",
          inicio: "Prefere começar",
          experiencia: "Experiência anterior",
          mensagem: "Mensagem"
        };
        var linhas = [];
        Object.keys(rotulos).forEach(function (campo) {
          var valor = data.get(campo);
          if (valor) linhas.push(rotulos[campo] + ": " + valor);
        });

        var assunto = "Pré-inscrição - " + (data.get("atleta") || "novo atleta");
        var corpo = "Pré-inscrição enviada pelo site.\n\n" + linhas.join("\n") + "\n";

        window.location.href = "mailto:cpaccpatinagem@gmail.com"
          + "?subject=" + encodeURIComponent(assunto)
          + "&body=" + encodeURIComponent(corpo);

        submit.removeAttribute("aria-busy");
        submit.innerHTML = original;
        showSuccess();
        return;
      }

      // Enviado como URL-encoded: é o formato que o Google Apps Script lê
      // diretamente em e.parameter, e evita o pedido preflight de CORS.
      var corpo = new URLSearchParams();
      data.forEach(function (valor, chave) { corpo.append(chave, valor); });

      fetch(endpoint, { method: "POST", body: corpo })
        .then(function (r) {
          // O Google Apps Script executa o doPost e depois redireciona para um
          // URL googleusercontent.com/macros/echo para devolver a resposta. Esse
          // redirecionamento devolve 404 a pedidos de outros sítios, mesmo quando
          // a inscrição foi gravada — confirmámos nos registos de execução.
          //
          // Por isso não podemos exigir r.ok: mostraríamos erro em inscrições
          // bem-sucedidas, e o pai voltaria a submeter. O redirecionamento é o
          // sinal de que o script correu; um endpoint errado devolve 404 sem
          // redirecionar, e uma falha de rede rejeita a promessa.
          if (!r.ok && !r.redirected) throw new Error("HTTP " + r.status);
          showSuccess();
        })
        .catch(function (err) {
          console.error(err);
          var box = $("[data-form-error]", form);
          if (box) {
            box.hidden = false;
            box.textContent = "Não foi possível enviar a pré-inscrição. Tente novamente, "
              + "ou telefone para 926 716 672 - assim não perde a vaga.";
          }
        })
        .finally(function () {
          submit.removeAttribute("aria-busy");
          submit.innerHTML = original;
        });
    }

    function showSuccess() {
      if (!success) return;
      form.hidden = true;
      success.classList.add("is-shown");
      success.setAttribute("tabindex", "-1");
      success.focus();
      success.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }

  /* ------------------------------------------------------------------
     11. Ano corrente no rodapé
     ------------------------------------------------------------------ */
  function initYear() {
    $$("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------
     Utilitário: um só listener de scroll, sincronizado com o rAF
     ------------------------------------------------------------------ */
  var scrollHandlers = [];
  var ticking = false;
  function onScroll(fn) {
    scrollHandlers.push(fn);
    fn(window.scrollY);
  }
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      scrollHandlers.forEach(function (fn) { fn(y); });
      ticking = false;
    });
  }, { passive: true });

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  function init() {
    initHeader();
    initMenu();
    initReveal();
    initCounters();
    initHeroParallax();
    initCardGlow();
    initFaq();
    initPathLine();
    initShine();
    initProgress();
    initHeroVideo();
    initForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
