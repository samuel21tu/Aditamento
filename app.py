import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import datetime
import json
import os
import sv_ttk
from scheduler import generate_daily_schedule, parse_dt

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor Contínuo de Escalas")
        self.root.geometry("1100x800")
        
        self.dispensas = {} # {pessoa_id: [(start_date, end_date)]}
        self.schedule_result = None
        
        self.state_file = "state.json"
        self.current_state = self.load_state()
        self.preview_state = None
        
        self.dispensas = self._parse_dispensas_from_state()
        
        self.guarda_compartilhada_file = "guarda_compartilhada.json"
        self.guarda_compartilhada = self.load_guarda_compartilhada()
        self.new_guarda_compartilhada_to_save = False
        
        self.setup_ui()
        self.atualizar_lista_pessoas()
        self.atualizar_lista_dispensas()
        self.atualizar_data_alvo()
        self.atualizar_lista_historico()
        
    def load_state(self):
        default_state = {'pessoas': {}, 'historico_escalas': [], 'dispensas': {}}
        for i in range(301, 360):
            default_state['pessoas'][str(i)] = {"ativo": True}
            
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    if 'pessoas' not in state:
                        state['pessoas'] = default_state['pessoas']
                    if 'historico_escalas' not in state:
                        state['historico_escalas'] = []
                    if 'dispensas' not in state:
                        state['dispensas'] = {}
                    return state
            except Exception as e:
                print("Erro ao carregar state.json:", e)
        
        return default_state
        
    def save_state(self, state):
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=4)
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar histórico:\n{e}")

    def load_guarda_compartilhada(self):
        default_state = {
            "filas": {
                "of_dia": [], "adj_of_dia": [], "cb_dia_bia_c": [], 
                "mot_dia": [], "padioleiro": [], "sombra": [], "mot_vila": [], "gda_vila": []
            },
            "historico_guarda": {}
        }
        if os.path.exists(self.guarda_compartilhada_file):
            try:
                with open(self.guarda_compartilhada_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    if "filas" not in state: state["filas"] = default_state["filas"]
                    if "historico_guarda" not in state: state["historico_guarda"] = default_state["historico_guarda"]
                    return state
            except Exception as e:
                print("Erro ao carregar guarda_compartilhada.json:", e)
        return default_state
        
    def save_guarda_compartilhada(self, state):
        try:
            with open(self.guarda_compartilhada_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=4)
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar guarda compartilhada:\n{e}")

    def get_next_date(self):
        historico = self.current_state.get('historico_escalas', [])
        if historico:
            # Pega a última data registrada no histórico
            last_date_str = historico[-1]['data']
            last_date = parse_dt(last_date_str)
            if last_date:
                return last_date + datetime.timedelta(days=1)
        return datetime.date.today() + datetime.timedelta(days=1)

    def setup_ui(self):
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        title_lbl = ttk.Label(main_frame, text="Gestão Contínua de Escalas", font=("Segoe UI", 24, "bold"))
        title_lbl.pack(pady=(0, 15))
        
        # Tabs
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        self.tab_efetivo = ttk.Frame(self.notebook, padding=10)
        self.tab_gerador = ttk.Frame(self.notebook, padding=10)
        self.tab_historico = ttk.Frame(self.notebook, padding=10)
        
        self.notebook.add(self.tab_gerador, text="1. Gerar Escala Diária")
        self.notebook.add(self.tab_historico, text="2. Histórico")
        self.notebook.add(self.tab_efetivo, text="3. Efetivo e Dispensas")
        
        self.setup_tab_efetivo()
        self.setup_tab_gerador()
        self.setup_tab_historico()

    def setup_tab_efetivo(self):
        paned = ttk.PanedWindow(self.tab_efetivo, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)
        
        # Cadastro
        cadastro_frame = ttk.LabelFrame(paned, text="Cadastro de Efetivo", padding="10")
        paned.add(cadastro_frame, weight=1)
        
        add_frame = ttk.Frame(cadastro_frame)
        add_frame.pack(fill=tk.X, pady=5)
        ttk.Label(add_frame, text="Nº:").pack(side=tk.LEFT)
        self.entry_add_pessoa = ttk.Entry(add_frame, width=10)
        self.entry_add_pessoa.pack(side=tk.LEFT, padx=5)
        ttk.Button(add_frame, text="Cadastrar", command=self.cadastrar_pessoa).pack(side=tk.LEFT)
        
        self.listbox_pessoas = tk.Listbox(cadastro_frame, height=15)
        self.listbox_pessoas.pack(fill=tk.BOTH, expand=True, pady=5)
        
        btn_frame = ttk.Frame(cadastro_frame)
        btn_frame.pack(fill=tk.X)
        ttk.Button(btn_frame, text="Alternar Ativo/Inativo (Rota)", command=self.alternar_status_pessoa).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(btn_frame, text="Excluir", command=self.excluir_pessoa).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)

        # Dispensas
        dispensas_frame = ttk.LabelFrame(paned, text="Dispensas Médicas / Férias", padding="10")
        paned.add(dispensas_frame, weight=1)
        
        d_top = ttk.Frame(dispensas_frame)
        d_top.pack(fill=tk.X)
        ttk.Label(d_top, text="Nº:").grid(row=0, column=0)
        self.entry_disp_pessoa = ttk.Entry(d_top, width=6)
        self.entry_disp_pessoa.grid(row=0, column=1)
        ttk.Label(d_top, text="Início:").grid(row=0, column=2)
        self.entry_disp_inicio = ttk.Entry(d_top, width=10)
        self.entry_disp_inicio.grid(row=0, column=3)
        ttk.Label(d_top, text="Fim:").grid(row=1, column=0)
        self.entry_disp_fim = ttk.Entry(d_top, width=10)
        self.entry_disp_fim.grid(row=1, column=1, columnspan=2)
        ttk.Button(d_top, text="Add", command=self.adicionar_dispensa).grid(row=1, column=3)
        
        self.listbox_dispensas = tk.Listbox(dispensas_frame, height=10)
        self.listbox_dispensas.pack(fill=tk.BOTH, expand=True, pady=5)
        ttk.Button(dispensas_frame, text="Remover Dispensa", command=self.remover_dispensa).pack()

    def setup_tab_gerador(self):
        gerador_frame = ttk.LabelFrame(self.tab_gerador, text="Geração de Escala", padding="15")
        gerador_frame.pack(fill=tk.X, pady=5)
        
        self.lbl_target_date = ttk.Label(gerador_frame, text="Data Alvo: --/--/----", font=("Segoe UI", 16, "bold"))
        self.lbl_target_date.pack(pady=5)
        
        opts_frame = ttk.Frame(gerador_frame)
        opts_frame.pack(pady=10)
        
        self.var_guarda = tk.BooleanVar(value=False)
        self.var_plantao = tk.BooleanVar(value=True)
        self.var_apoio = tk.BooleanVar(value=False)
        
        ttk.Checkbutton(opts_frame, text="Incluir GUARDA (24)", variable=self.var_guarda).pack(side=tk.LEFT, padx=10)
        ttk.Checkbutton(opts_frame, text="Incluir PLANTÃO (6)", variable=self.var_plantao).pack(side=tk.LEFT, padx=10)
        ttk.Checkbutton(opts_frame, text="Incluir APOIO (2)", variable=self.var_apoio).pack(side=tk.LEFT, padx=10)
        
        self.manual_gc_frame = ttk.LabelFrame(gerador_frame, text="Preenchimento Manual de Funções (Guarnição)", padding="10")
        self.manual_gc_frame.pack(fill=tk.X, pady=10)
        
        self.manual_entries = {}
        funcoes_list = [
            ("OF DIA", "of_dia"), ("ADJ OF DIA", "adj_of_dia"), 
            ("SGT DIA BIA C", "sgt_dia_bia_c"), ("CB DIA BIA C", "cb_dia_bia_c"), 
            ("MOT DIA", "mot_dia"), ("PADIOLEIRO", "padioleiro"), 
            ("SOMBRA", "sombra"), ("MOT VILA", "mot_vila"), ("GDA VILA", "gda_vila")
        ]
        
        for i, (label, key) in enumerate(funcoes_list):
            row = i // 3
            col = (i % 3) * 2
            ttk.Label(self.manual_gc_frame, text=label+":").grid(row=row, column=col, padx=5, pady=5, sticky=tk.W)
            entry = ttk.Entry(self.manual_gc_frame, width=20)
            entry.grid(row=row, column=col+1, padx=5, pady=5, sticky=tk.W)
            self.manual_entries[key] = entry

        actions_frame = ttk.Frame(gerador_frame)
        actions_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(actions_frame, text="1. GERAR PRÉVIA DO DIA", command=self.gerar_escala, style="Accent.TButton").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.btn_confirm = ttk.Button(actions_frame, text="2. CONFIRMAR E SALVAR", command=self.confirmar_escala, state=tk.DISABLED)
        self.btn_confirm.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.btn_print = ttk.Button(actions_frame, text="IMPRIMIR DIA", command=self.imprimir_escala, state=tk.DISABLED)
        self.btn_print.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        details_frame = ttk.LabelFrame(self.tab_gerador, text="Visualização da Prévia", padding="10")
        details_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        self.text_details = tk.Text(details_frame, wrap=tk.WORD, font=("Consolas", 14))
        self.text_details.pack(fill=tk.BOTH, expand=True)

    def setup_tab_historico(self):
        paned = ttk.PanedWindow(self.tab_historico, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)
        
        list_frame = ttk.LabelFrame(paned, text="Escalas Salvas", padding="10")
        paned.add(list_frame, weight=1)
        
        self.listbox_historico = tk.Listbox(list_frame, height=15, font=("Consolas", 12))
        self.listbox_historico.pack(fill=tk.BOTH, expand=True, pady=5)
        self.listbox_historico.bind('<<ListboxSelect>>', self.on_historico_select)
        
        btn_frame = ttk.Frame(list_frame)
        btn_frame.pack(fill=tk.X)
        ttk.Button(btn_frame, text="Excluir Escala Selecionada", command=self.excluir_historico).pack(fill=tk.X)
        
        view_frame = ttk.LabelFrame(paned, text="Detalhes da Escala", padding="10")
        paned.add(view_frame, weight=2)
        
        self.text_hist_details = tk.Text(view_frame, wrap=tk.WORD, font=("Consolas", 14))
        self.text_hist_details.pack(fill=tk.BOTH, expand=True)

    def parse_dt_local(self, date_str):
        try: return datetime.datetime.strptime(date_str, "%d/%m/%Y").date()
        except: return None
        
    def _parse_dispensas_from_state(self):
        dispensas_str = self.current_state.get('dispensas', {})
        disp_parsed = {}
        for p_str, dates in dispensas_str.items():
            p_int = int(p_str)
            disp_parsed[p_int] = []
            for d_start_str, d_end_str in dates:
                try:
                    d_start = datetime.datetime.strptime(d_start_str, "%Y-%m-%d").date()
                    d_end = datetime.datetime.strptime(d_end_str, "%Y-%m-%d").date()
                    disp_parsed[p_int].append((d_start, d_end))
                except: pass
        return disp_parsed
        
    def _sync_dispensas_to_state(self):
        dispensas_str = {}
        for p_int, dates in self.dispensas.items():
            dispensas_str[str(p_int)] = []
            for d_start, d_end in dates:
                dispensas_str[str(p_int)].append((d_start.strftime("%Y-%m-%d"), d_end.strftime("%Y-%m-%d")))
        self.current_state['dispensas'] = dispensas_str

    # --- EFETIVO LOGIC ---
    def atualizar_lista_pessoas(self):
        self.listbox_pessoas.delete(0, tk.END)
        pessoas_db = self.current_state.get('pessoas', {})
        sorted_keys = sorted(pessoas_db.keys(), key=lambda x: int(x) if x.isdigit() else x)
        for k in sorted_keys:
            ativo = pessoas_db[k].get('ativo', True)
            status = "ATIVO" if ativo else "INATIVO (ROTA)"
            self.listbox_pessoas.insert(tk.END, f"{k} - {status}")

    def cadastrar_pessoa(self):
        p = self.entry_add_pessoa.get().strip()
        if not p.isdigit(): return messagebox.showerror("Erro", "Nº inválido.")
        pessoas_db = self.current_state.get('pessoas', {})
        if p in pessoas_db: messagebox.showinfo("Aviso", "Pessoa já cadastrada.")
        else:
            pessoas_db[p] = {"ativo": True}
            self.current_state['pessoas'] = pessoas_db
            self.save_state(self.current_state)
            self.atualizar_lista_pessoas()
            self.entry_add_pessoa.delete(0, tk.END)

    def alternar_status_pessoa(self):
        selection = self.listbox_pessoas.curselection()
        if not selection: return
        p = self.listbox_pessoas.get(selection[0]).split(" - ")[0]
        pessoas_db = self.current_state.get('pessoas', {})
        if p in pessoas_db:
            pessoas_db[p]['ativo'] = not pessoas_db[p].get('ativo', True)
            self.save_state(self.current_state)
            self.atualizar_lista_pessoas()

    def excluir_pessoa(self):
        selection = self.listbox_pessoas.curselection()
        if not selection: return
        p = self.listbox_pessoas.get(selection[0]).split(" - ")[0]
        if messagebox.askyesno("Excluir", f"Tem certeza que deseja apagar o registro de {p}?"):
            pessoas_db = self.current_state.get('pessoas', {})
            if p in pessoas_db:
                del pessoas_db[p]
                self.save_state(self.current_state)
                self.atualizar_lista_pessoas()

    def atualizar_lista_dispensas(self):
        self.listbox_dispensas.delete(0, tk.END)
        for pessoa, dates in self.dispensas.items():
            for inicio, fim in dates:
                self.listbox_dispensas.insert(tk.END, f"P {pessoa}: {inicio.strftime('%d/%m/%Y')} a {fim.strftime('%d/%m/%Y')}")

    def adicionar_dispensa(self):
        p_str = self.entry_disp_pessoa.get().strip()
        inicio = self.parse_dt_local(self.entry_disp_inicio.get().strip())
        fim = self.parse_dt_local(self.entry_disp_fim.get().strip())
        if not p_str.isdigit() or not inicio or not fim or inicio > fim: return
        pessoa = int(p_str)
        if pessoa not in self.dispensas: self.dispensas[pessoa] = []
        self.dispensas[pessoa].append((inicio, fim))
        
        self._sync_dispensas_to_state()
        self.save_state(self.current_state)
        
        self.atualizar_lista_dispensas()
        self.entry_disp_pessoa.delete(0, tk.END)
        self.entry_disp_inicio.delete(0, tk.END)
        self.entry_disp_fim.delete(0, tk.END)

    def remover_dispensa(self):
        selection = self.listbox_dispensas.curselection()
        if not selection: return
        try:
            item_text = self.listbox_dispensas.get(selection[0])
            pessoa = int(item_text.split(":")[0].replace("P ", "").strip())
            # Vamos extrair as datas da string para remover exatamente esta dispensa
            # Formato: "P 301: 10/05/2026 a 20/05/2026"
            datas_str = item_text.split(":")[1].strip()
            inicio_str, fim_str = datas_str.split(" a ")
            inicio = datetime.datetime.strptime(inicio_str, "%d/%m/%Y").date()
            fim = datetime.datetime.strptime(fim_str, "%d/%m/%Y").date()
            
            if pessoa in self.dispensas: 
                if (inicio, fim) in self.dispensas[pessoa]:
                    self.dispensas[pessoa].remove((inicio, fim))
                if len(self.dispensas[pessoa]) == 0:
                    del self.dispensas[pessoa]
                
                self._sync_dispensas_to_state()
                self.save_state(self.current_state)
            
            self.atualizar_lista_dispensas()
        except Exception as e: 
            print("Erro ao remover:", e)

    # --- GERADOR LOGIC ---
    def atualizar_data_alvo(self):
        prox_dia = self.get_next_date()
        dias_nomes = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
        nome_dia = dias_nomes[prox_dia.weekday()]
        self.lbl_target_date.config(text=f"Data Alvo: {prox_dia.strftime('%d/%m/%Y')} ({nome_dia})")
        
        self.var_guarda.set(False)
        self.var_plantao.set(True)
        self.var_apoio.set(False)
        
        if hasattr(self, 'manual_entries'):
            target_str = prox_dia.strftime("%Y-%m-%d")
            self.guarda_compartilhada = self.load_guarda_compartilhada()
            hist = self.guarda_compartilhada.get('historico_guarda', {}).get(target_str, {})
            for key, entry in self.manual_entries.items():
                entry.delete(0, tk.END)
                if key != "sgt_dia_bia_c" and key in hist:
                    entry.insert(0, hist[key])

    def gerar_escala(self):
        target_date = self.get_next_date()
        has_g = self.var_guarda.get()
        has_p = self.var_plantao.get()
        has_a = self.var_apoio.get()
        
        if not has_g and not has_p and not has_a:
            return messagebox.showerror("Erro", "Selecione pelo menos uma função.")

        try:
            self.guarda_compartilhada = self.load_guarda_compartilhada()
            target_str = target_date.strftime("%Y-%m-%d")
            
            guarda_comp_hoje = None
            self.new_guarda_compartilhada_to_save = False
            
            if has_g:
                guarda_comp_hoje = {}
                for key, entry in self.manual_entries.items():
                    val = entry.get().strip()
                    guarda_comp_hoje[key] = val if val else "-"
                self.new_guarda_compartilhada_to_save = True

            result, new_state = generate_daily_schedule(
                target_date, has_g, has_p, has_a, self.dispensas, self.current_state
            )
            
            if guarda_comp_hoje:
                result['guarda_comp'] = guarda_comp_hoje
                if new_state.get('historico_escalas'):
                    new_state['historico_escalas'][-1]['guarda_comp'] = guarda_comp_hoje
            
            self.schedule_result = result
            self.preview_state = new_state
            
            self.text_details.delete("1.0", tk.END)
            self.text_details.insert(tk.END, f"--- ESCALA PRÉVIA: {target_date.strftime('%d/%m/%Y')} ---\n\n")
            
            if has_g:
                if guarda_comp_hoje:
                    self.text_details.insert(tk.END, "--- GUARNIÇÃO COMPARTILHADA ---\n")
                    self.text_details.insert(tk.END, f"OF DIA (1° TEN): {guarda_comp_hoje.get('of_dia')}\n")
                    self.text_details.insert(tk.END, f"ADJ OF DIA (2° SGT): {guarda_comp_hoje.get('adj_of_dia')}\n")
                    self.text_details.insert(tk.END, f"SGT DIA BIA C (3° SGT): {guarda_comp_hoje.get('sgt_dia_bia_c')}\n")
                    self.text_details.insert(tk.END, f"CB DIA BIA C: {guarda_comp_hoje.get('cb_dia_bia_c')}\n")
                    self.text_details.insert(tk.END, f"MOT DIA: {guarda_comp_hoje.get('mot_dia')}\n")
                    self.text_details.insert(tk.END, f"PADIOLEIRO: {guarda_comp_hoje.get('padioleiro')}\n")
                    self.text_details.insert(tk.END, f"SOMBRA: {guarda_comp_hoje.get('sombra')}\n")
                    self.text_details.insert(tk.END, f"MOT VILA: {guarda_comp_hoje.get('mot_vila')}\n")
                    self.text_details.insert(tk.END, f"GDA VILA: {guarda_comp_hoje.get('gda_vila')}\n\n")
                self.text_details.insert(tk.END, f"GUARDA ({len(result['guarda'])}): {', '.join(result['guarda'])}\n\n")
                
            if has_p: self.text_details.insert(tk.END, f"PLANTÃO ({len(result['plantao'])}): {', '.join(result['plantao'])}\n\n")
            if has_a: self.text_details.insert(tk.END, f"APOIO HT/PARIA ({len(result['apoio'])}): {', '.join(result['apoio'])}\n\n")
            
            self.btn_confirm.config(state=tk.NORMAL)
            self.btn_print.config(state=tk.DISABLED)
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro:\n{str(e)}")

    def confirmar_escala(self):
        if not self.preview_state: return
        if messagebox.askyesno("Confirmar", "Confirmar esta escala e avançar o dia?"):
            if self.schedule_result and 'guarda_comp' in self.schedule_result:
                if self.new_guarda_compartilhada_to_save:
                    self.guarda_compartilhada = self.load_guarda_compartilhada()
                    target_str = self.schedule_result['data']
                    
                    gc_to_save = self.schedule_result['guarda_comp'].copy()
                    if 'sgt_dia_bia_c' in gc_to_save:
                        del gc_to_save['sgt_dia_bia_c']
                    self.guarda_compartilhada['historico_guarda'][target_str] = gc_to_save
                    self.save_guarda_compartilhada(self.guarda_compartilhada)

            self.current_state = self.preview_state
            self.save_state(self.current_state)
            self.btn_confirm.config(state=tk.DISABLED)
            self.btn_print.config(state=tk.NORMAL)
            self.atualizar_data_alvo()
            self.atualizar_lista_historico()
            if messagebox.askyesno("Imprimir", "Deseja imprimir agora?"):
                self.imprimir_escala(self.schedule_result)

    def imprimir_escala(self, item=None):
        if not item: item = self.schedule_result
        if not item: return
        try:
            from docx import Document
            from docx.shared import Pt, Inches
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn

            def set_cell_background(cell, color_hex):
                tc = cell._tc
                tcPr = tc.get_or_add_tcPr()
                shd = OxmlElement('w:shd')
                shd.set(qn('w:val'), 'clear')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:fill'), color_hex)
                tcPr.append(shd)

            docx_file = "aditamento.docx"
            document = Document()
            
            sections = document.sections
            for section in sections:
                section.top_margin = Inches(0.5)
                section.bottom_margin = Inches(0.5)
                section.left_margin = Inches(0.8)
                section.right_margin = Inches(0.8)
                
            style = document.styles['Normal']
            font = style.font
            font.name = 'Times New Roman'
            font.size = Pt(11)

            d = item['data']
            if isinstance(d, str):
                d_dt = parse_dt(d)
                ds = ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo"][d_dt.weekday()]
            else:
                d_dt = d
                ds = ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo"][item['dia_semana']]

            meses = {1:"janeiro", 2:"fevereiro", 3:"março", 4:"abril", 5:"maio", 6:"junho", 7:"julho", 8:"agosto", 9:"setembro", 10:"outubro", 11:"novembro", 12:"dezembro"}
            d_str = f"{d_dt.day} de {meses[d_dt.month]} de {d_dt.year}"
            
            gc = item.get('guarda_comp', {})
            
            gda_str = " - ".join(item.get('guarda', [])) if item.get('guarda') else "-"
            plantao_str = " - ".join(item.get('plantao', [])) if item.get('plantao') else "-"
            apoio_str = " - ".join(item.get('apoio', [])) if item.get('apoio') else "-"

            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing = Pt(14)
            p.paragraph_format.space_after = Pt(0)
            
            run = p.add_run("MINISTÉRIO DA DEFESA\nEXÉRCITO BRASILEIRO\n17º GRUPO DE ARTILHARIA DE CAMPANHA\n(6º Regimento de Artilharia Montada/1915)\nGRUPO JERÔNIMO DE ALBUQUERQUE")
            run.bold = True
            
            document.add_paragraph()

            p2 = document.add_paragraph()
            p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p2.add_run(f"Visto Sgte _________________\nQuartel em Natal-RN, {d_str}.\n({ds})")

            document.add_paragraph()

            p3 = document.add_paragraph()
            p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run3 = p3.add_run("ADITAMENTO AO BOLETIM INTERNO DA BATERIA DE COMANDO Nº ____/2026, referente ao BOLETIM\nINTERNO Nº ____/2026, do 17º GAC.")
            run3.bold = True
            run3.font.size = Pt(9)
            
            document.add_paragraph()

            p4 = document.add_paragraph()
            p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p4.add_run("Para conhecimento desta Subunidade e devida execução, publico o seguinte:\n")
            run4 = p4.add_run("1ª Parte\nSERVIÇOS DIÁRIOS")
            run4.bold = True
            
            document.add_paragraph()

            table = document.add_table(rows=15, cols=3)
            table.style = 'Table Grid'
            
            row = table.rows[0]
            row.cells[0].merge(row.cells[2])
            cell = row.cells[0]
            cell.text = f"Serviço Externo para {ds}, {d_str}."
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            cell.paragraphs[0].runs[0].bold = True
            set_cell_background(cell, "D9D9D9")
            
            data_rows = [
                ("MOT VILA", "SD EP", gc.get('mot_vila', '-')),
                ("GDA VILA", "SD EP", gc.get('gda_vila', '-'))
            ]
            
            for i, (f1, f2, f3) in enumerate(data_rows):
                row = table.rows[i+1]
                row.cells[0].text = f1; row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; row.cells[0].paragraphs[0].runs[0].bold = True
                row.cells[1].text = f2; row.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; row.cells[1].paragraphs[0].runs[0].bold = True
                row.cells[2].text = f3; row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            row = table.rows[3]
            row.cells[0].merge(row.cells[2])
            cell = row.cells[0]
            cell.text = f"Serviço Interno para {ds}, {d_str}."
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            cell.paragraphs[0].runs[0].bold = True
            set_cell_background(cell, "D9D9D9")
            
            data_rows_in = [
                ("OF DIA", "1º TEN", gc.get('of_dia', '-')),
                ("ADJ OF DIA", "2º SGT", gc.get('adj_of_dia', '-')),
                ("SGT DIA BIA C", "3º SGT", gc.get('sgt_dia_bia_c', '-')),
                ("CB DIA BIA C", "CB EP", gc.get('cb_dia_bia_c', '-')),
                ("MOT DIA", "CB CET", gc.get('mot_dia', '-')),
                ("PADIOLEIRO", "SD EP", gc.get('padioleiro', '-')),
                ("SOMBRA", "SD EP", gc.get('sombra', '-')),
                ("GDA QTEL", "SD EV", gda_str),
                ("PLANTÕES", "SD EV", plantao_str),
                ("APOIO PRAIA/HT", "SD EV", apoio_str)
            ]
            
            for i, (f1, f2, f3) in enumerate(data_rows_in):
                row = table.rows[i+4]
                row.cells[0].text = f1; row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; row.cells[0].paragraphs[0].runs[0].bold = True
                row.cells[1].text = f2; row.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; row.cells[1].paragraphs[0].runs[0].bold = True
                row.cells[2].text = f3; row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

            row = table.rows[14]
            row.cells[0].text = "PARADA DIÁRIA"; row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; row.cells[0].paragraphs[0].runs[0].bold = True
            set_cell_background(row.cells[0], "D9D9D9")
            row.cells[1].text = "-"; row.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_cell_background(row.cells[1], "D9D9D9")
            row.cells[2].text = "9h30min"; row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            document.add_paragraph()
            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run("2ª Parte\nINSTRUÇÃO").bold = True
            document.add_paragraph("- Sem Alteração.")
            
            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run("3ª Parte\nASSUNTOS GERAIS E ADMINISTRATIVOS").bold = True
            
            document.add_paragraph("1. ASSUNTOS GERAIS").runs[0].bold = True
            document.add_paragraph("- Sem Alteração.")
            
            document.add_paragraph("2. ASSUNTOS ADMINISTRATIVOS").runs[0].bold = True
            document.add_paragraph("- Sem Alteração.")
            
            p = document.add_paragraph(f"- INÍCIO DO EXPEDIENTE PARA {ds.upper()}, {d_str.upper()}")
            p_small = document.add_paragraph("a. Atividade: TFM\n- Início do Expediente para OF/ST/SGT: 07h30min pronto no Campo de Futebol: Unif 14º.\n- Início do Expediente para CB/SD EP: 07h30min pronto no Campo de Futebol: Unif 14º.\n- Início do Expediente para SD EV: 06h45min pronto na SU: Unif 14º.")
            p_small.runs[0].font.size = Pt(9)
            
            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run("4ª Parte\nJUSTIÇA E DISCIPLINA").bold = True
            document.add_paragraph("- Sem Alteração.")
            
            document.add_paragraph("\n")
            
            p = document.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run("RENAN LOUREIRO LENTZ - Cap\nComandante da Bateria de Comando")
            run.bold = True
            
            document.save(docx_file)
            os.startfile(docx_file)
            
        except ImportError:
            messagebox.showerror("Erro", "A biblioteca python-docx não está instalada.")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro de Impressão:\n{e}")

    # --- HISTORICO LOGIC ---
    def atualizar_lista_historico(self):
        self.listbox_historico.delete(0, tk.END)
        historico = self.current_state.get('historico_escalas', [])
        for i, reg in enumerate(historico):
            dt = parse_dt(reg['data'])
            dt_str = dt.strftime("%d/%m/%Y")
            self.listbox_historico.insert(tk.END, f"{i} - Escala do dia {dt_str}")

    def on_historico_select(self, event):
        selection = self.listbox_historico.curselection()
        if not selection: return
        idx = int(self.listbox_historico.get(selection[0]).split(" - ")[0])
        historico = self.current_state.get('historico_escalas', [])
        if idx >= len(historico): return
        
        item = historico[idx]
        self.text_hist_details.delete("1.0", tk.END)
        dt = parse_dt(item['data'])
        self.text_hist_details.insert(tk.END, f"--- HISTÓRICO: {dt.strftime('%d/%m/%Y')} ---\n\n")
        
        if item.get('has_guarda'): 
            if 'guarda_comp' in item:
                gc = item['guarda_comp']
                self.text_hist_details.insert(tk.END, "--- GUARNIÇÃO COMPARTILHADA ---\n")
                self.text_hist_details.insert(tk.END, f"OF DIA (1° TEN): {gc.get('of_dia')}\n")
                self.text_hist_details.insert(tk.END, f"ADJ OF DIA (2° SGT): {gc.get('adj_of_dia')}\n")
                self.text_hist_details.insert(tk.END, f"SGT DIA BIA C (3° SGT): {gc.get('sgt_dia_bia_c')}\n")
                self.text_hist_details.insert(tk.END, f"CB DIA BIA C: {gc.get('cb_dia_bia_c')}\n")
                self.text_hist_details.insert(tk.END, f"MOT DIA: {gc.get('mot_dia')}\n")
                self.text_hist_details.insert(tk.END, f"PADIOLEIRO: {gc.get('padioleiro')}\n")
                self.text_hist_details.insert(tk.END, f"SOMBRA: {gc.get('sombra')}\n")
                self.text_hist_details.insert(tk.END, f"MOT VILA: {gc.get('mot_vila')}\n")
                self.text_hist_details.insert(tk.END, f"GDA VILA: {gc.get('gda_vila')}\n\n")
            self.text_hist_details.insert(tk.END, f"GUARDA ({len(item.get('guarda', []))}): {', '.join(item.get('guarda', []))}\n\n")
            
        if item.get('has_plantao'): self.text_hist_details.insert(tk.END, f"PLANTÃO ({len(item['plantao'])}): {', '.join(item['plantao'])}\n\n")
        if item.get('has_apoio'): self.text_hist_details.insert(tk.END, f"APOIO HT/PARIA ({len(item['apoio'])}): {', '.join(item['apoio'])}\n\n")

    def excluir_historico(self):
        selection = self.listbox_historico.curselection()
        if not selection: return
        idx = int(self.listbox_historico.get(selection[0]).split(" - ")[0])
        historico = self.current_state.get('historico_escalas', [])
        
        if idx >= len(historico): return
        
        dt_str = parse_dt(historico[idx]['data']).strftime("%d/%m/%Y")
        if messagebox.askyesno("Excluir", f"Você tem certeza que deseja EXCLUIR a escala do dia {dt_str}?\n\nOs registros de trabalho de todo o efetivo neste dia serão apagados!"):
            del historico[idx]
            self.current_state['historico_escalas'] = historico
            self.save_state(self.current_state)
            self.atualizar_lista_historico()
            self.atualizar_data_alvo()
            self.text_hist_details.delete("1.0", tk.END)
            messagebox.showinfo("Sucesso", "Escala excluída com sucesso! Os serviços das pessoas voltaram como se este dia nunca tivesse existido.")

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    sv_ttk.set_theme("dark")
    root.mainloop()
