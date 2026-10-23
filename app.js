/**
 * PrintCost D3D - Sistema de Custos & Gestão de Parque de Impressão 3D
 * Danilo Barbosa Vieira ® Todos os direitos reservados
 * Arquitetura 100% Offline com SafeStorage
 */

(function () {
  'use strict';

  // --- Armazenamento local persistente ---
  const SafeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.error('Não foi possível ler os dados salvos no navegador:', error);
        alert('Não foi possível acessar o armazenamento local. Seus dados podem não estar disponíveis neste navegador.');
        throw error;
      }
    },

    set(key, val) {
      try {
        window.localStorage.setItem(key, val);
      } catch (error) {
        console.error('Não foi possível persistir os dados no navegador:', error);
        alert('Não foi possível salvar os dados permanentemente. Verifique o espaço disponível e as permissões de armazenamento do navegador.');
        throw error;
      }
    },

    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error('Não foi possível remover os dados salvos no navegador:', error);
        alert('Não foi possível atualizar o armazenamento local. Verifique as permissões do navegador.');
        throw error;
      }
    },
  };

  // --- Storage Keys ---
  const STORAGE_KEY_DB = 'printcost_d3d_db_v1';
  const STORAGE_KEY_DEFAULTS = 'printcost_d3d_defaults_v1';
  const STORAGE_KEY_THEME = 'printcost_d3d_theme_v1';
  const STORAGE_KEY_PIX = 'printcost_d3d_pix_v1';
  const STORAGE_KEY_DONATION_TEXT = 'printcost_d3d_donation_text_v1';

  const PRELOADED_PRINTERS = [
    { id: 'printer_ender3_v3', name: 'Creality Ender 3 V3 SE' },
    { id: 'printer_bambu_a1', name: 'Bambu Lab A1' },
  ];

  const CATEGORY_COLORS = {
    filament: '#38bdf8',
    energy: '#fbbf24',
    deprec: '#a855f7',
    packaging: '#34d399',
    freight: '#f97316',
    other: '#ec4899',
  };

  // --- Motor de Banco de Dados Local ---
  const DB = {
    data: {
      printers: [],
      jobs: [],
    },

    load() {
      const saved = SafeStorage.get(STORAGE_KEY_DB);
      if (saved) {
        let parsed;
        try {
          parsed = JSON.parse(saved);
        } catch (error) {
          console.error('Os dados locais estão inválidos e foram preservados para evitar perda:', error);
          alert('Não foi possível ler o banco de dados local. Os dados originais foram preservados; restaure um backup válido para continuar.');
          this.data = { printers: [], jobs: [] };
          return;
        }

        if (parsed && Array.isArray(parsed.printers)) {
          this.data.printers = parsed.printers;
          this.data.jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
          const originalPrinterCount = this.data.printers.length;
          this.data.printers = this.data.printers.filter(printer => {
            const preloaded = PRELOADED_PRINTERS.some(defaultPrinter =>
              printer.id === defaultPrinter.id && printer.name === defaultPrinter.name
            );
            const hasProduction = this.data.jobs.some(job => job.printerId === printer.id);
            return !preloaded || hasProduction;
          });
          if (this.data.printers.length !== originalPrinterCount) this.save();
          return;
        }

        console.error('Formato inválido no banco de dados local; os dados foram preservados.');
        alert('O banco de dados local está em um formato inválido. Os dados originais foram preservados; restaure um backup válido para continuar.');
        this.data = { printers: [], jobs: [] };
        return;
      }

      this.data = { printers: [], jobs: [] };
      this.save();
    },

    save() {
      SafeStorage.set(STORAGE_KEY_DB, JSON.stringify(this.data));
    },

    getPrinters() {
      return this.data.printers;
    },

    getPrinter(id) {
      return this.data.printers.find(p => p.id === id);
    },

    savePrinter(printer) {
      const idx = this.data.printers.findIndex(p => p.id === printer.id);
      if (idx >= 0) {
        this.data.printers[idx] = { ...this.data.printers[idx], ...printer };
      } else {
        this.data.printers.push(printer);
      }
      this.save();
    },

    deletePrinter(id) {
      this.data.printers = this.data.printers.filter(p => p.id !== id);
      this.save();
    },

    getJobs(printerId = 'all') {
      if (!printerId || printerId === 'all') {
        return this.data.jobs;
      }
      return this.data.jobs.filter(j => j.printerId === printerId);
    },

    getJob(id) {
      return this.data.jobs.find(j => j.id === id);
    },

    addJob(job) {
      this.data.jobs.unshift(job);
      this.save();
    },

    deleteJob(id) {
      this.data.jobs = this.data.jobs.filter(j => j.id !== id);
      this.save();
    },

    clearJobs() {
      this.data.jobs = [];
      this.save();
    },

    getPrinterStats(printerId) {
      const printer = this.getPrinter(printerId);
      const jobs = this.getJobs(printerId);

      const totalHours = jobs.reduce((acc, j) => acc + (Number(j.hours) || 0), 0);
      const totalCost = jobs.reduce((acc, j) => acc + (Number(j.costTotal) || 0), 0);
      const totalRevenue = jobs.reduce((acc, j) => acc + (Number(j.sellPrice) || 0), 0);
      const totalProfit = jobs.reduce((acc, j) => acc + (Number(j.profit) || 0), 0);
      const jobCount = jobs.length;

      const purchasePrice = printer ? (Number(printer.purchasePrice) || 1) : 1;
      const lifespanHours = printer ? (Number(printer.lifespanHours) || 1) : 1;

      const paybackPct = Math.max(0, (totalProfit / purchasePrice) * 100);
      const lifespanPct = Math.min(100, Math.max(0, (totalHours / lifespanHours) * 100));

      return {
        totalHours,
        totalCost,
        totalRevenue,
        totalProfit,
        jobCount,
        paybackPct,
        lifespanPct,
      };
    },

    getGlobalStats() {
      const jobs = this.data.jobs;
      const totalHours = jobs.reduce((acc, j) => acc + (Number(j.hours) || 0), 0);
      const totalCost = jobs.reduce((acc, j) => acc + (Number(j.costTotal) || 0), 0);
      const totalRevenue = jobs.reduce((acc, j) => acc + (Number(j.sellPrice) || 0), 0);
      const totalProfit = jobs.reduce((acc, j) => acc + (Number(j.profit) || 0), 0);

      return {
        totalPrinters: this.data.printers.length,
        totalHours,
        totalCost,
        totalRevenue,
        totalProfit,
        totalJobs: jobs.length,
      };
    },
  };

  // --- Helpers de Formatação e DOM ---
  const formatBRL = (val) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getNum = (id) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };

  const setVal = (id, val) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.value = (val !== null && val !== undefined) ? val : '';
  };

  const setText = (id, text) => {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (el) el.textContent = text;
  };

  // --- Toast Notification ---
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // --- Tab Navigation ---
  function initTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tab.dataset.tab;
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.classList.add('active');
        }

        if (targetId === 'tab-reports') {
          renderReportsTab();
        }
      });
    });
  }

  function switchToCalculatorTab() {
    const navBtnCalc = document.getElementById('nav-btn-calculator');
    if (navBtnCalc) navBtnCalc.click();
  }

  // --- Printer Management ---
  function updatePrinterDropdown() {
    const select = document.getElementById('select-printer');
    const filterSelect = document.getElementById('filter-printer');
    const tabCount = document.getElementById('tab-printers-count');

    if (!select) return;

    const printers = DB.getPrinters();
    const prevVal = select.value;

    select.innerHTML = printers.length === 0
      ? '<option value="">Cadastre uma impressora para começar</option>'
      : printers.map(p => `
      <option value="${p.id}">${p.name} (${p.brand || '3D'})</option>
    `).join('');

    if (prevVal && printers.some(p => p.id === prevVal)) {
      select.value = prevVal;
    } else if (printers.length > 0) {
      select.value = printers[0].id;
    }

    const editButton = document.getElementById('btn-edit-current-printer');
    if (editButton) editButton.disabled = printers.length === 0;

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">Todas as Impressoras</option>' +
        printers.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    if (tabCount) {
      tabCount.textContent = printers.length.toString();
    }

    handlePrinterSelectChange();
  }

  function handlePrinterSelectChange() {
    const select = document.getElementById('select-printer');
    if (!select) return;
    const printerId = select.value;
    const printer = DB.getPrinter(printerId);
    if (!printer) {
      setVal('printer-power', '');
      setVal('depreciation-rate', '');
      setVal('printer-cost', '');
      setVal('printer-lifespan', '');
      setVal('maintenance-cost', '');
      setText('printer-quick-info', 'Cadastre uma impressora para preencher os dados da máquina.');
      calculate();
      return;
    }

    // Atualiza campos vinculados à impressora
    setVal('printer-power', printer.powerWatts || 150);
    setVal('depreciation-rate', (Number(printer.depreciationRate) || 0.64).toFixed(2));
    setVal('printer-cost', printer.purchasePrice || 1400);
    setVal('printer-lifespan', printer.lifespanHours || 2500);
    setVal('maintenance-cost', printer.maintenanceCost || 200);

    const stats = DB.getPrinterStats(printerId);
    setText('printer-quick-info',
      `⚡ ${printer.powerWatts}W • Deprec: R$ ${formatBRL(printer.depreciationRate)}/h • Rodadas: ${stats.totalHours.toFixed(1)}h • Payback: ${stats.paybackPct.toFixed(1)}%`
    );

    calculate();
  }

  // --- Modal de Impressora ---
  function openPrinterModal(printerId = null) {
    const modal = document.getElementById('modal-printer');
    const title = document.getElementById('modal-printer-title');
    const form = document.getElementById('form-printer');
    if (!modal) return;

    if (printerId) {
      const printer = DB.getPrinter(printerId);
      if (!printer) return;
      if (title) title.textContent = 'Editar Impressora';
      setVal('modal-printer-id', printer.id);
      setVal('modal-printer-name', printer.name);
      setVal('modal-printer-brand', printer.brand || '');
      setVal('modal-printer-power', printer.powerWatts || 150);
      setVal('modal-printer-cost', printer.purchasePrice || 1500);
      setVal('modal-printer-lifespan', printer.lifespanHours || 2500);
      setVal('modal-printer-maintenance', printer.maintenanceCost || 200);
      setVal('modal-printer-notes', printer.notes || '');
    } else {
      if (title) title.textContent = 'Cadastrar Nova Impressora';
      if (form) form.reset();
      setVal('modal-printer-id', '');
    }

    updateModalDeprecPreview();
    modal.classList.add('open');
  }

  function closePrinterModal() {
    const modal = document.getElementById('modal-printer');
    if (modal) modal.classList.remove('open');
  }

  function updateModalDeprecPreview() {
    const cost = getNum('modal-printer-cost');
    const maint = getNum('modal-printer-maintenance');
    const life = Math.max(1, getNum('modal-printer-lifespan'));
    const rate = (cost + maint) / life;
    setText('modal-preview-deprec', `R$ ${formatBRL(rate)} / hora`);
  }

  function handleSavePrinterSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('modal-printer-id');
    const nameInput = document.getElementById('modal-printer-name');

    const id = (idInput && idInput.value) ? idInput.value : 'printer_' + Date.now();
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
      alert('Por favor, informe o nome da impressora.');
      return;
    }

    const cost = Math.max(0, getNum('modal-printer-cost'));
    const maint = Math.max(0, getNum('modal-printer-maintenance'));
    const life = Math.max(1, getNum('modal-printer-lifespan'));
    const rate = (cost + maint) / life;

    const brandInput = document.getElementById('modal-printer-brand');
    const notesInput = document.getElementById('modal-printer-notes');

    const printerObj = {
      id,
      name,
      brand: brandInput ? brandInput.value.trim() : '',
      powerWatts: Math.max(10, getNum('modal-printer-power')),
      purchasePrice: cost,
      lifespanHours: life,
      maintenanceCost: maint,
      depreciationRate: rate,
      notes: notesInput ? notesInput.value.trim() : '',
      updatedAt: new Date().toISOString(),
    };

    DB.savePrinter(printerObj);
    closePrinterModal();
    updatePrinterDropdown();

    const select = document.getElementById('select-printer');
    if (select) {
      select.value = id;
      handlePrinterSelectChange();
    }

    renderReportsTab();
    showToast(`🖨️ Impressora "${name}" salva com sucesso!`);
  }

  function handleDeletePrinter(id) {
    const printer = DB.getPrinter(id);
    if (!printer) return;

    if (confirm(`Tem certeza que deseja excluir a impressora "${printer.name}"?`)) {
      DB.deletePrinter(id);
      updatePrinterDropdown();
      renderReportsTab();
      showToast('Impressora excluída.');
    }
  }

  // --- MOTOR DE CÁLCULO ---
  let lastCalculatedState = null;

  function calculate() {
    try {
      // 1. Tempo
      const hours = Math.max(0, getNum('print-hours'));
      const mins = Math.max(0, Math.min(59, getNum('print-minutes')));
      const totalHours = hours + (mins / 60);

      setText('total-time-hint', `Tempo total: ${hours}h ${mins}min (${totalHours.toFixed(2)} horas)`);

      // 2. Filamento
      const filPriceKg = Math.max(0, getNum('filament-price'));
      const filUsedGrams = Math.max(0, getNum('filament-used'));
      const filLossPct = Math.max(0, getNum('filament-loss'));
      const totalGramsWithLoss = filUsedGrams * (1 + (filLossPct / 100));
      const costFilament = totalGramsWithLoss * (filPriceKg / 1000);

      setText('filament-loss-val', `${filLossPct}%`);
      setText('loss-badge', `+${filLossPct}%`);
      setText('detail-filament-desc', `${totalGramsWithLoss.toFixed(1)}g c/ perda (R$ ${formatBRL(filPriceKg)}/kg)`);

      // 3. Energia
      const kwhPrice = Math.max(0, getNum('kwh-price'));
      const printerWatts = Math.max(0, getNum('printer-power'));
      const totalKwh = (printerWatts * totalHours) / 1000;
      const costEnergy = totalKwh * kwhPrice;

      setText('detail-energy-desc', `${totalKwh.toFixed(3)} kWh (${totalHours.toFixed(1)}h a ${printerWatts}W)`);

      // 4. Depreciação
      const isAdvanced = document.getElementById('depreciation-advanced')?.checked;
      let hourlyDeprecRate = 0;

      if (isAdvanced) {
        const pCost = Math.max(0, getNum('printer-cost'));
        const pLife = Math.max(1, getNum('printer-lifespan'));
        const pMaint = Math.max(0, getNum('maintenance-cost'));
        hourlyDeprecRate = (pCost + pMaint) / pLife;
        setText('calc-deprec-hint', `Taxa resultante: R$ ${formatBRL(hourlyDeprecRate)} / hora de uso`);
      } else {
        hourlyDeprecRate = Math.max(0, getNum('depreciation-rate'));
      }

      const costDeprec = hourlyDeprecRate * totalHours;
      setText('detail-deprec-desc', `${totalHours.toFixed(1)}h de máquina (R$ ${formatBRL(hourlyDeprecRate)}/h)`);

      // 5. Embalagem, Frete e Outros
      const costPackaging = Math.max(0, getNum('packaging-cost'));
      const costFreight = Math.max(0, getNum('freight-cost'));
      const otherCost = Math.max(0, getNum('other-expenses'));
      const laborCost = Math.max(0, getNum('labor-cost'));
      const costOtherTotal = otherCost + laborCost;

      // 6. CUSTO TOTAL DE PRODUÇÃO
      const totalCost = costFilament + costEnergy + costDeprec + costPackaging + costFreight + costOtherTotal;

      setText('total-cost-val', formatBRL(totalCost));
      setText('chart-center-amount', `R$ ${formatBRL(totalCost)}`);

      // Atualiza Detalhamento de Itens
      const calcPct = (c) => totalCost > 0 ? ((c / totalCost) * 100).toFixed(1) : '0';

      setText('cost-filament-val', `R$ ${formatBRL(costFilament)}`);
      setText('cost-filament-pct', `${calcPct(costFilament)}%`);

      setText('cost-energy-val', `R$ ${formatBRL(costEnergy)}`);
      setText('cost-energy-pct', `${calcPct(costEnergy)}%`);

      setText('cost-deprec-val', `R$ ${formatBRL(costDeprec)}`);
      setText('cost-deprec-pct', `${calcPct(costDeprec)}%`);

      setText('cost-packaging-val', `R$ ${formatBRL(costPackaging)}`);
      setText('cost-packaging-pct', `${calcPct(costPackaging)}%`);

      setText('cost-freight-val', `R$ ${formatBRL(costFreight)}`);
      setText('cost-freight-pct', `${calcPct(costFreight)}%`);

      setText('cost-other-val', `R$ ${formatBRL(costOtherTotal)}`);
      setText('cost-other-pct', `${calcPct(costOtherTotal)}%`);

      // 7. Margem de Lucro e Venda
      const profitMarginPct = Math.max(0, getNum('profit-margin-number'));
      const cardFeePct = Math.max(0, Math.min(99, getNum('card-fee')));
      const customSell = getNum('custom-sell-price');

      let finalSellPrice = 0;
      let netProfit = 0;

      if (customSell > 0) {
        finalSellPrice = customSell;
        const feeAmount = finalSellPrice * (cardFeePct / 100);
        netProfit = finalSellPrice - totalCost - feeAmount;
      } else {
        const base = totalCost * (1 + (profitMarginPct / 100));
        const divider = 1 - (cardFeePct / 100);
        finalSellPrice = divider > 0 ? base / divider : base;
        const feeAmount = finalSellPrice * (cardFeePct / 100);
        netProfit = finalSellPrice - totalCost - feeAmount;
      }

      setText('suggested-price-val', `R$ ${formatBRL(finalSellPrice)}`);

      const profitEl = document.getElementById('net-profit-val');
      if (profitEl) {
        profitEl.textContent = `${netProfit >= 0 ? '+' : ''} R$ ${formatBRL(netProfit)}`;
        profitEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
      }

      // Guarda estado para o registro
      lastCalculatedState = {
        hours: totalHours,
        weightGrams: filUsedGrams,
        costFilament,
        costEnergy,
        costDeprec,
        costPackaging,
        costFreight,
        costOtherTotal,
        costTotal: totalCost,
        sellPrice: finalSellPrice,
        profit: netProfit,
        marginPct: profitMarginPct,
      };

      // 8. Renderiza Gráfico SVG
      renderChart([
        { name: 'filament', val: costFilament, color: CATEGORY_COLORS.filament },
        { name: 'energy', val: costEnergy, color: CATEGORY_COLORS.energy },
        { name: 'deprec', val: costDeprec, color: CATEGORY_COLORS.deprec },
        { name: 'packaging', val: costPackaging, color: CATEGORY_COLORS.packaging },
        { name: 'freight', val: costFreight, color: CATEGORY_COLORS.freight },
        { name: 'other', val: costOtherTotal, color: CATEGORY_COLORS.other },
      ], totalCost);

    } catch (err) {
      console.error('Erro no cálculo:', err);
    }
  }

  // --- Renderizador do Gráfico SVG Donut ---
  function renderChart(slices, total) {
    const svg = document.getElementById('donut-chart');
    if (!svg) return;

    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.82297

    // Remove fatias anteriores
    const existing = svg.querySelectorAll('.donut-slice');
    existing.forEach(s => s.remove());

    if (!total || total <= 0) return;

    let currentAngle = -90; // Inicia às 12 horas (topo)

    slices.forEach((slice) => {
      const val = Number(slice.val) || 0;
      if (val <= 0) return;

      const fraction = val / total;
      const sliceLength = fraction * circumference;
      const angle = fraction * 360;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('class', 'donut-slice');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', slice.color);
      circle.style.stroke = slice.color;
      circle.setAttribute('stroke-width', '22');
      circle.setAttribute('stroke-dasharray', `${sliceLength} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', '0');
      circle.setAttribute('transform', `rotate(${currentAngle} 100 100)`);

      svg.appendChild(circle);
      currentAngle += angle;
    });
  }

  // --- Limpar Campos da Calculadora ---
  function clearCalculatorFields(showNotification = true) {
    setVal('piece-name', '');
    setVal('client-name', '');
    setVal('filament-used', '');
    setVal('print-hours', '0');
    setVal('print-minutes', '0');
    setVal('packaging-cost', '0.00');
    setVal('freight-cost', '0.00');
    setVal('other-expenses', '0.00');
    setVal('labor-cost', '0.00');
    setVal('custom-sell-price', '');

    calculate();

    if (showNotification) {
      showToast('🧹 Campos limpos com sucesso para novo cálculo!');
    }
  }

  // --- Registrar Produção no Banco Local & Limpar Campos Automaticamente ---
  function registerProductionJob() {
    calculate();
    if (!lastCalculatedState) return;

    const select = document.getElementById('select-printer');
    const printerId = select ? select.value : '';
    const printer = DB.getPrinter(printerId);
    if (!printer) {
      alert('Cadastre e selecione uma impressora antes de registrar uma produção.');
      return;
    }

    const pieceName = (document.getElementById('piece-name')?.value || '').trim() || 'Projeto Sem Nome';
    const filUsed = getNum('filament-used');
    const hours = getNum('print-hours');
    const mins = getNum('print-minutes');

    // Validação mínima para não registrar cálculo totalmente zerado por acidente
    if (filUsed === 0 && hours === 0 && mins === 0 && (lastCalculatedState.costTotal || 0) === 0) {
      alert('Por favor, informe ao menos o peso gasto (gramas) ou o tempo de impressão antes de registrar.');
      return;
    }

    const printerName = printer.name;
    const clientName = (document.getElementById('client-name')?.value || '').trim();
    const materialType = (document.getElementById('filament-material')?.value || '').trim() || 'PLA';
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const fullJob = {
      id: Date.now(),
      printerId,
      printerName,
      pieceName,
      clientName,
      materialType,
      date: dateStr,
      timestamp: Date.now(),
      rawInputs: {
        filamentPrice: getNum('filament-price'),
        filamentUsed: filUsed,
        filamentLoss: getNum('filament-loss'),
        kwhPrice: getNum('kwh-price'),
        printerPower: getNum('printer-power'),
        printHours: hours,
        printMinutes: mins,
        depreciationRate: getNum('depreciation-rate'),
        packagingCost: getNum('packaging-cost'),
        freightCost: getNum('freight-cost'),
        otherExpenses: getNum('other-expenses'),
        laborCost: getNum('labor-cost'),
        profitMargin: getNum('profit-margin-number'),
        cardFee: getNum('card-fee'),
        customSellPrice: getNum('custom-sell-price'),
      },
      ...lastCalculatedState,
    };

    // 1. Salva no banco de dados local
    DB.addJob(fullJob);

    // 2. Atualiza a lista do histórico da calculadora
    renderMiniHistory();

    // 3. Atualiza os relatórios do parque de impressoras (horas, custos e lucros da máquina)
    renderReportsTab();

    // 4. Atualiza o badge sob o seletor da impressora
    handlePrinterSelectChange();

    // 5. LIMPA OS CAMPOS PARA UM NOVO CÁLCULO (Conforme solicitado!)
    clearCalculatorFields(false);

    showToast(`✅ "${pieceName}" salva no histórico! Campos limpos para o próximo cálculo.`);
  }

  // --- Editar Registro de Produção ---
  function editCalculation(id) {
    const job = DB.getJob(id);
    if (!job) return;

    setVal('piece-name', job.pieceName || '');
    setVal('client-name', job.clientName || '');
    if (job.materialType) setVal('filament-material', job.materialType);

    const select = document.getElementById('select-printer');
    if (select && job.printerId) {
      select.value = job.printerId;
    }

    if (job.rawInputs) {
      const r = job.rawInputs;
      setVal('filament-price', r.filamentPrice);
      setVal('filament-used', r.filamentUsed);
      setVal('filament-loss', r.filamentLoss);
      setVal('kwh-price', r.kwhPrice);
      setVal('printer-power', r.printerPower);
      setVal('print-hours', r.printHours);
      setVal('print-minutes', r.printMinutes);
      setVal('depreciation-rate', r.depreciationRate);
      setVal('packaging-cost', r.packagingCost);
      setVal('freight-cost', r.freightCost);
      setVal('other-expenses', r.otherExpenses);
      setVal('labor-cost', r.laborCost);
      setVal('profit-margin', r.profitMargin);
      setVal('profit-margin-number', r.profitMargin);
      setVal('card-fee', r.cardFee);
      setVal('custom-sell-price', r.customSellPrice || '');
    } else {
      setVal('filament-used', job.weightGrams || 100);
      setVal('profit-margin-number', job.marginPct || 100);
      setVal('profit-margin', job.marginPct || 100);
    }

    switchToCalculatorTab();
    calculate();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    showToast(`✏️ Cálculo "${job.pieceName}" carregado na calculadora!`);
  }

  // --- Render Histórico na Calculadora ---
  function renderMiniHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const jobs = DB.getJobs().slice(0, 10);
    if (jobs.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhuma impressão registrada ainda. Clique em "Registrar Produção" para salvar no banco local.</p>';
      return;
    }

    container.innerHTML = jobs.map(j => `
      <div class="history-item">
        <div>
          <span class="history-title">${j.pieceName}</span>
          <span class="history-meta">${j.printerName} • ${(Number(j.hours) || 0).toFixed(1)}h • ${j.date}</span>
          <div class="history-actions">
            <button type="button" class="btn-mini btn-edit-job" data-id="${j.id}">✏️ Editar</button>
            <button type="button" class="btn-mini btn-mini-danger btn-del-job" data-id="${j.id}">🗑️ Excluir</button>
          </div>
        </div>
        <div class="history-costs">
          <span class="history-cost-tag">Custo: R$ ${formatBRL(j.costTotal)}</span>
          <span class="history-meta">Venda: R$ ${formatBRL(j.sellPrice)}</span>
          <span class="history-meta text-success">+R$ ${formatBRL(j.profit)}</span>
        </div>
      </div>
    `).join('');
  }

  // --- Render Aba de Relatórios & Parque de Impressoras ---
  function renderReportsTab() {
    const global = DB.getGlobalStats();
    const printers = DB.getPrinters();

    setText('kpi-total-printers', global.totalPrinters.toString());
    setText('kpi-total-hours', `${global.totalHours.toFixed(1)}h`);
    setText('kpi-total-cost', `R$ ${formatBRL(global.totalCost)}`);
    setText('kpi-total-profit', `+ R$ ${formatBRL(global.totalProfit)}`);
    setText('printers-badge-total', `${printers.length} ${printers.length === 1 ? 'máquina' : 'máquinas'}`);

    // Render Cards das Impressoras
    const cardsGrid = document.getElementById('printers-cards-grid');
    if (cardsGrid) {
      if (printers.length === 0) {
        cardsGrid.innerHTML = '<p class="empty-state">Nenhuma impressora cadastrada. Clique em "Nova Impressora" acima.</p>';
      } else {
        cardsGrid.innerHTML = printers.map(p => {
          const stats = DB.getPrinterStats(p.id);
          const paybackClamped = Math.min(100, stats.paybackPct);
          const hoursLeft = Math.max(0, (Number(p.lifespanHours) || 2500) - stats.totalHours);

          return `
            <div class="printer-card">
              <div class="printer-card-header">
                <div>
                  <h4 class="printer-card-title">${p.name}</h4>
                  <span class="printer-card-brand">${p.brand || 'Impressora 3D'} • ${p.powerWatts}W</span>
                </div>
                <span class="badge-tag">R$ ${formatBRL(p.depreciationRate)}/h</span>
              </div>

              <div class="printer-metrics-grid">
                <div class="metric-item">
                  <span class="metric-title">Horas Rodadas</span>
                  <span class="metric-value">${stats.totalHours.toFixed(1)}h</span>
                </div>
                <div class="metric-item">
                  <span class="metric-title">Peças Feitas</span>
                  <span class="metric-value">${stats.jobCount}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-title">Custo Impresso</span>
                  <span class="metric-value">R$ ${formatBRL(stats.totalCost)}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-title">Lucro Gerado</span>
                  <span class="metric-value text-success">+ R$ ${formatBRL(stats.totalProfit)}</span>
                </div>
              </div>

              <!-- Retorno de Investimento (Payback) -->
              <div class="progress-block">
                <div class="progress-header">
                  <span>Retorno do Investimento (Payback)</span>
                  <strong>${stats.paybackPct.toFixed(1)}% do valor pago</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill progress-roi" style="width: ${paybackClamped}%"></div>
                </div>
                <small class="hint">${stats.paybackPct >= 100 ? '🎉 Máquina 100% Paga e Gerando Lucro Puro!' : `Falta R$ ${formatBRL(Math.max(0, (Number(p.purchasePrice) || 0) - stats.totalProfit))} para se pagar`}</small>
              </div>

              <!-- Desgaste / Vida Útil -->
              <div class="progress-block">
                <div class="progress-header">
                  <span>Desgaste / Vida Útil</span>
                  <strong>${stats.lifespanPct.toFixed(1)}% (${hoursLeft.toFixed(0)}h restantes)</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill progress-life" style="width: ${stats.lifespanPct}%"></div>
                </div>
              </div>

              <div class="printer-card-actions">
                <button type="button" class="btn-text btn-edit-printer" data-id="${p.id}">⚙️ Editar</button>
                <button type="button" class="btn-text btn-delete-printer" data-id="${p.id}">🗑️ Excluir</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    renderJobsTable();
  }

  // --- Render Tabela de Produções ---
  function renderJobsTable() {
    const tableBody = document.getElementById('jobs-table-body');
    const filterSelect = document.getElementById('filter-printer');
    if (!tableBody) return;

    const selectedPrinter = filterSelect ? filterSelect.value : 'all';
    const jobs = DB.getJobs(selectedPrinter);

    if (jobs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">Nenhuma produção registrada para esta seleção. Registre uma peça na aba "Calculadora de Custos".</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = jobs.map(j => `
      <tr>
        <td>${j.date || '-'}</td>
        <td><span class="badge-tag">${j.printerName || 'Impressora'}</span></td>
        <td>
          <span class="cell-name">${j.pieceName || 'Peça 3D'}</span>
          ${j.clientName ? `<span class="cell-sub">${j.clientName}</span>` : ''}
        </td>
        <td>${(Number(j.hours) || 0).toFixed(1)}h</td>
        <td>${j.weightGrams || 0}g</td>
        <td>R$ ${formatBRL(j.costTotal)}</td>
        <td><strong>R$ ${formatBRL(j.sellPrice)}</strong></td>
        <td class="text-success">+ R$ ${formatBRL(j.profit)}</td>
        <td>
          <div style="display: flex; gap: 0.3rem;">
            <button type="button" class="btn-mini btn-edit-job" data-id="${j.id}" title="Carregar para editar">✏️</button>
            <button type="button" class="btn-mini btn-mini-danger btn-del-job" data-id="${j.id}" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --- Margem de Lucro: Sincronização entre Slider, Input Numérico e Pílulas ---
  function setupProfitMarginSync() {
    const slider = document.getElementById('profit-margin');
    const numberInput = document.getElementById('profit-margin-number');
    const pills = document.querySelectorAll('.btn-pill');

    function updatePills(val) {
      pills.forEach(p => {
        if (p.dataset.margin === String(val)) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    if (slider && numberInput) {
      slider.addEventListener('input', (e) => {
        numberInput.value = e.target.value;
        updatePills(e.target.value);
        calculate();
      });

      numberInput.addEventListener('input', (e) => {
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        slider.value = Math.min(300, val);
        updatePills(val);
        calculate();
      });

      document.querySelector('.margin-quick-buttons')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-pill');
        if (!btn) return;
        const margin = btn.dataset.margin;
        slider.value = margin;
        numberInput.value = margin;
        updatePills(margin);
        calculate();
      });
    }
  }

  // --- Toggle de Depreciação Avançada ---
  function setupDepreciationToggle() {
    const toggle = document.getElementById('depreciation-advanced');
    const simpleBox = document.getElementById('depreciation-simple-box');
    const advancedBox = document.getElementById('depreciation-advanced-box');

    if (toggle && simpleBox && advancedBox) {
      toggle.addEventListener('change', () => {
        if (toggle.checked) {
          simpleBox.classList.add('hidden');
          advancedBox.classList.remove('hidden');
        } else {
          simpleBox.classList.remove('hidden');
          advancedBox.classList.add('hidden');
        }
        calculate();
      });
    }
  }

  // --- Salvar / Carregar Padrões ---
  function saveDefaults() {
    const defaults = {
      filamentPrice: getNum('filament-price'),
      kwhPrice: getNum('kwh-price'),
      cardFee: getNum('card-fee'),
      packagingCost: getNum('packaging-cost'),
      laborCost: getNum('labor-cost'),
      otherExpenses: getNum('other-expenses'),
    };
    SafeStorage.set(STORAGE_KEY_DEFAULTS, JSON.stringify(defaults));
    showToast('💾 Parâmetros padrão salvos com sucesso!');
  }

  function loadDefaults() {
    const saved = SafeStorage.get(STORAGE_KEY_DEFAULTS);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.filamentPrice !== undefined) setVal('filament-price', data.filamentPrice);
      if (data.kwhPrice !== undefined) setVal('kwh-price', data.kwhPrice);
      if (data.cardFee !== undefined) setVal('card-fee', data.cardFee);
      if (data.packagingCost !== undefined) setVal('packaging-cost', data.packagingCost);
      if (data.laborCost !== undefined) setVal('labor-cost', data.laborCost);
      if (data.otherExpenses !== undefined) setVal('other-expenses', data.otherExpenses);
    } catch (e) {
      console.warn('Erro ao carregar padrões:', e);
    }
  }

  // --- Gestão da Aba de Doação (PIX Fixo) ---
  function setupDonationSection() {
    const displayPix = document.getElementById('display-pix-key');
    const btnCopyPix = document.getElementById('btn-copy-pix');
    const FIXED_PIX_KEY = 'danilobavi.dev@gmail.com';

    if (displayPix) {
      displayPix.value = FIXED_PIX_KEY;
    }

    // Copiar Chave PIX
    btnCopyPix?.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(FIXED_PIX_KEY).then(() => {
          showToast('📋 Chave PIX copiada: ' + FIXED_PIX_KEY);
        }).catch(() => fallbackCopy(FIXED_PIX_KEY));
      } else {
        fallbackCopy(FIXED_PIX_KEY);
      }
    });
  }

  // --- Copiar Resumo para WhatsApp ---
  function copySummary() {
    const select = document.getElementById('select-printer');
    const printerName = select ? select.options[select.selectedIndex]?.text : 'Impressora 3D';
    const piece = document.getElementById('piece-name')?.value || 'Peça em Impressão 3D';
    const client = document.getElementById('client-name')?.value ? `\n👤 *Cliente:* ${document.getElementById('client-name').value}` : '';
    const totalCost = document.getElementById('total-cost-val')?.textContent || '0,00';
    const sellPrice = document.getElementById('suggested-price-val')?.textContent || '0,00';
    const hours = document.getElementById('print-hours')?.value || '0';
    const mins = document.getElementById('print-minutes')?.value || '0';
    const grams = document.getElementById('filament-used')?.value || '0';
    const material = document.getElementById('filament-material')?.value || 'PLA';

    const summaryText =
`📦 *ORÇAMENTO DE IMPRESSÃO 3D • PrintCost D3D*
━━━━━━━━━━━━━━━━━━━━━
🧩 *Peça:* ${piece}${client}
🖨️ *Equipamento:* ${printerName}
🧵 *Material:* ${material}
⚖️ *Peso Estimado:* ~${grams}g
⏳ *Tempo de Produção:* ${hours}h ${mins}min

💰 *Valor Total do Pedido:* ${sellPrice}
*(Custo base calculado: R$ ${totalCost})*

✅ Material calibrado com alta precisão
✅ Acabamento e pós-processamento inclusos
━━━━━━━━━━━━━━━━━━━━━
_Gerado via PrintCost D3D • Danilo Barbosa Vieira ®_`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summaryText).then(() => {
        showToast('📋 Orçamento copiado para a Área de Transferência!');
      }).catch(() => fallbackCopy(summaryText));
    } else {
      fallbackCopy(summaryText);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('📋 Copiado com sucesso!');
    } catch (e) {
      alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
    document.body.removeChild(ta);
  }

  // --- Tema Claro / Escuro ---
  function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    SafeStorage.set(STORAGE_KEY_THEME, next);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = next === 'light' ? '☀️' : '🌙';
  }

  function loadTheme() {
    const saved = SafeStorage.get(STORAGE_KEY_THEME) || 'dark';
    document.body.setAttribute('data-theme', saved);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = saved === 'light' ? '☀️' : '🌙';
  }

  // --- Backup Export / Import ---
  function exportBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(DB.data, null, 2));
    const dl = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `printcost_d3d_backup_${date}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
    showToast('📥 Backup exportado com sucesso!');
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && Array.isArray(imported.printers) && Array.isArray(imported.jobs)) {
          DB.data = imported;
          DB.save();
          updatePrinterDropdown();
          renderMiniHistory();
          renderReportsTab();
          showToast('📤 Backup restaurado com sucesso!');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao processar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- Event Listeners Setup ---
  function setupListeners() {
    const calcInputIds = [
      'filament-material', 'filament-price', 'filament-used', 'filament-loss',
      'kwh-price', 'printer-power', 'print-hours', 'print-minutes',
      'depreciation-rate', 'printer-cost', 'printer-lifespan', 'maintenance-cost',
      'packaging-cost', 'freight-cost', 'other-expenses', 'labor-cost',
      'profit-margin-number', 'card-fee', 'custom-sell-price',
    ];

    calcInputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    document.getElementById('filament-loss')?.addEventListener('input', (e) => {
      setText('filament-loss-val', `${e.target.value}%`);
      setText('loss-badge', `+${e.target.value}%`);
      calculate();
    });

    document.getElementById('select-printer')?.addEventListener('change', handlePrinterSelectChange);

    document.getElementById('btn-quick-add-printer')?.addEventListener('click', () => openPrinterModal());
    document.getElementById('btn-open-add-printer')?.addEventListener('click', () => openPrinterModal());
    document.getElementById('btn-edit-current-printer')?.addEventListener('click', () => {
      const sel = document.getElementById('select-printer');
      if (sel) openPrinterModal(sel.value);
    });

    ['modal-printer-cost', 'modal-printer-lifespan', 'modal-printer-maintenance'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateModalDeprecPreview);
    });

    document.getElementById('form-printer')?.addEventListener('submit', handleSavePrinterSubmit);
    document.getElementById('btn-close-modal')?.addEventListener('click', closePrinterModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closePrinterModal);

    document.getElementById('modal-printer')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-printer') closePrinterModal();
    });

    // BOTÃO LIMPAR: Limpa os campos para novo cálculo imediatamente
    document.getElementById('btn-reset')?.addEventListener('click', () => clearCalculatorFields(true));

    document.getElementById('btn-save-defaults')?.addEventListener('click', saveDefaults);
    document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-copy-summary')?.addEventListener('click', copySummary);
    document.getElementById('btn-print')?.addEventListener('click', () => window.print());

    // BOTÃO REGISTRAR PRODUÇÃO: Salva no histórico e limpa os campos para o próximo cálculo
    document.getElementById('btn-save-history')?.addEventListener('click', registerProductionJob);

    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      if (confirm('Deseja limpar todos os registros de produção do banco local?')) {
        DB.clearJobs();
        renderMiniHistory();
        renderReportsTab();
        showToast('Histórico limpo!');
      }
    });

    document.getElementById('filter-printer')?.addEventListener('change', renderJobsTable);

    document.getElementById('printers-cards-grid')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-printer');
      if (editBtn) {
        openPrinterModal(editBtn.dataset.id);
        return;
      }
      const delBtn = e.target.closest('.btn-delete-printer');
      if (delBtn) {
        handleDeletePrinter(delBtn.dataset.id);
        return;
      }
    });

    document.getElementById('history-list')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-job');
      if (editBtn) {
        editCalculation(parseInt(editBtn.dataset.id, 10));
        return;
      }
      const delBtn = e.target.closest('.btn-del-job');
      if (delBtn) {
        const id = parseInt(delBtn.dataset.id, 10);
        if (confirm('Deseja excluir este registro do histórico?')) {
          DB.deleteJob(id);
          renderMiniHistory();
          renderReportsTab();
          handlePrinterSelectChange();
          showToast('Registro excluído!');
        }
      }
    });

    document.getElementById('jobs-table-body')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-job');
      if (editBtn) {
        editCalculation(parseInt(editBtn.dataset.id, 10));
        return;
      }
      const delBtn = e.target.closest('.btn-del-job');
      if (delBtn) {
        const id = parseInt(delBtn.dataset.id, 10);
        if (confirm('Deseja excluir este registro de produção?')) {
          DB.deleteJob(id);
          renderJobsTable();
          renderMiniHistory();
          renderReportsTab();
          handlePrinterSelectChange();
          showToast('Registro excluído!');
        }
      }
    });

    document.getElementById('btn-export-backup')?.addEventListener('click', exportBackup);
    document.getElementById('input-import-backup')?.addEventListener('change', importBackup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePrinterModal();
    });
  }

  // --- Inicialização da Aplicação ---
  function init() {
    try {
      loadTheme();
      setText('current-date', new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
      DB.load();
      initTabs();
      setupProfitMarginSync();
      setupDepreciationToggle();
      setupDonationSection();
      updatePrinterDropdown();
      loadDefaults();
      renderMiniHistory();
      setupListeners();
      calculate();
    } catch (err) {
      console.error('Erro na inicialização:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
