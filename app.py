import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import datetime
import json
import os
import sv_ttk
from scheduler import generate_daily_schedule, parse_dt, calculate_points
from constants import UNIDADES_DATA, FUNCOES_BASE, HAS_CATEGORY, DEFAULT_CMT, DEFAULT_SGTE
from doc_generator import DocumentGenerator

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor Contínuo de Escalas")
        self.root.geometry("1100x800")
        
        self.dispensas = {} # {pessoa_id: [(start_date, end_date)]}
        self.schedule_result = None
        
        import sys
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            
        self.state_file = os.path.join(base_dir, "state.json")
        
        # Definir Ícone do App
        try:
            icon_path = self.get_resource_path("brasao.png")
            if os.path.exists(icon_path):
                img_icon = tk.PhotoImage(file=icon_path)
                self.root.iconphoto(False, img_icon)
        except Exception as e:
            print("Erro ao carregar ícone:", e)
        
        self.UNIDADES_DATA = UNIDADES_DATA
        
        self.current_state = self.load_state()
        self.preview_state = None
        
        self.dispensas = self._parse_dispensas_from_state()
        
        self.setup_ui()
        self.atualizar_lista_pessoas()
        self.atualizar_lista_dispensas()
        self.atualizar_data_alvo()
        self.atualizar_lista_historico()
        self.atualizar_ranking()
        
    def get_resource_path(self, relative_path):
        """ Get absolute path to resource, works for dev and for PyInstaller """
        try:
            import sys
            base_path = sys._MEIPASS
        except Exception:
            base_path = os.path.abspath(".")
        return os.path.join(base_path, relative_path)
        
    def solicitar_unidade(self):
        selection = {"val": "BC"}
        win = tk.Toplevel(self.root)
        win.title("Configuração Inicial")
        win.geometry("400x300")
        win.transient(self.root)
        win.grab_set()
        
        ttk.Label(win, text="Selecione a Subunidade:", font=("Segoe UI", 12, "bold")).pack(pady=20)
        
        var = tk.StringVar(value="BC")
        ttk.Radiobutton(win, text="Bateria de Comando (Soldados 301+)", variable=var, value="BC").pack(anchor=tk.W, padx=50, pady=5)
        ttk.Radiobutton(win, text="1ª Bateria de Obuses (Soldados 401+)", variable=var, value="1BO").pack(anchor=tk.W, padx=50, pady=5)
        ttk.Radiobutton(win, text="2ª Bateria de Obuses (Soldados 501+)", variable=var, value="2BO").pack(anchor=tk.W, padx=50, pady=5)
        
        def confirmar():
            selection["val"] = var.get()
            win.destroy()
            
        ttk.Button(win, text="Confirmar e Iniciar", command=confirmar, style="Accent.TButton").pack(pady=30)
        
        self.root.wait_window(win)
        return selection["val"]

    def load_state(self):
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    if 'unidade' not in state:
                        state['unidade'] = self.solicitar_unidade()
                        self.save_state(state)
                    return state
            except Exception as e:
                print("Erro ao carregar state.json:", e)
        
        # Novo Estado Inicial
        unidade = self.solicitar_unidade()
        id_start = self.UNIDADES_DATA[unidade]["id_start"]
        
        default_state = {
            'unidade': unidade,
            'pessoas': {}, 
            'historico_escalas': [], 
            'dispensas': {},
            'nome_cmt': DEFAULT_CMT,
            'nome_sgte': DEFAULT_SGTE,
            'req_counts': {
                'guarda': 24,
                'plantao': 6,
                'apoio': 2,
                'sobre_aviso': 2
            }
        }
        for i in range(id_start, id_start + 60):
            default_state['pessoas'][str(i)] = {"ativo": True}
            
        return default_state
        
    def save_state(self, state):
        try:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=4)
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar histórico:\n{e}")



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
        self.tab_ranking = ttk.Frame(self.notebook, padding=10)
        self.tab_config = ttk.Frame(self.notebook, padding=10)
        
        self.notebook.add(self.tab_gerador, text="1. Gerar Escala Diária")
        self.notebook.add(self.tab_historico, text="2. Histórico")
        self.notebook.add(self.tab_efetivo, text="3. Efetivo e Dispensas")
        self.notebook.add(self.tab_ranking, text="4. Rank de Cansaço")
        self.notebook.add(self.tab_config, text="5. Configurações")
        
        self.setup_tab_efetivo()
        self.setup_tab_gerador()
        self.setup_tab_historico()
        self.setup_tab_ranking()
        self.setup_tab_config()

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

        btn_frame_2 = ttk.Frame(cadastro_frame)
        btn_frame_2.pack(fill=tk.X, pady=2)
        ttk.Button(btn_frame_2, text="Alternar PO", command=self.alternar_po_pessoa).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(btn_frame_2, text="Alternar Sgte", command=self.alternar_sargentiacao_pessoa).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)

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
        # Pegar sigla da unidade para os labels
        unidade_key = self.current_state.get('unidade', 'BC')
        udata = self.UNIDADES_DATA.get(unidade_key, self.UNIDADES_DATA['BC'])
        u_sigla_doc = udata['sigla_doc']

        gerador_frame = ttk.LabelFrame(self.tab_gerador, text="Geração de Escala", padding="15")
        gerador_frame.pack(fill=tk.X, pady=5)
        
        self.lbl_target_date = ttk.Label(gerador_frame, text="Data Alvo: --/--/----", font=("Segoe UI", 16, "bold"))
        self.lbl_target_date.pack(pady=5)
        
        opts_frame = ttk.Frame(gerador_frame)
        opts_frame.pack(pady=10)
        
        self.var_guarda = tk.BooleanVar(value=False)
        self.var_plantao = tk.BooleanVar(value=True)
        self.var_apoio = tk.BooleanVar(value=False)
        self.var_sobre_aviso = tk.BooleanVar(value=False)
        self.var_sem_expediente = tk.BooleanVar(value=False)
        
        self.chk_guarda = ttk.Checkbutton(opts_frame, text="Incluir GUARDA", variable=self.var_guarda)
        self.chk_guarda.pack(side=tk.LEFT, padx=10)
        self.chk_plantao = ttk.Checkbutton(opts_frame, text="Incluir PLANTÃO", variable=self.var_plantao)
        self.chk_plantao.pack(side=tk.LEFT, padx=10)
        self.chk_apoio = ttk.Checkbutton(opts_frame, text="Incluir APOIO", variable=self.var_apoio)
        self.chk_apoio.pack(side=tk.LEFT, padx=10)
        self.chk_sobre_aviso = ttk.Checkbutton(opts_frame, text="Incluir SOBRE AVISO", variable=self.var_sobre_aviso)
        self.chk_sobre_aviso.pack(side=tk.LEFT, padx=10)
        ttk.Checkbutton(opts_frame, text="SEM EXPEDIENTE", variable=self.var_sem_expediente).pack(side=tk.LEFT, padx=10)
        
        self.atualizar_labels_quantitativos()
        
        self.manual_gc_frame = ttk.LabelFrame(gerador_frame, text="Preenchimento Manual de Funções (Guarnição)", padding="10")
        self.manual_gc_frame.pack(fill=tk.X, pady=10)
        
        self.manual_entries = {}
        self.manual_categories = {}
        self.funcoes_list = []
        for label_raw, key in FUNCOES_BASE:
            label = label_raw.format(unit=u_sigla_doc)
            self.funcoes_list.append((label, key))
        
        for i, (label, key) in enumerate(self.funcoes_list):
            row = i // 4
            col = (i % 4) * 2
            
            f_frame = ttk.Frame(self.manual_gc_frame)
            f_frame.grid(row=row, column=col, columnspan=2, padx=2, pady=5, sticky=tk.W)
            
            ttk.Label(f_frame, text=label+":").pack(side=tk.LEFT)
            entry = ttk.Entry(f_frame, width=12)
            entry.pack(side=tk.LEFT, padx=2)
            self.manual_entries[key] = entry
            
            if key in HAS_CATEGORY:
                cat_var = tk.StringVar(value="SD EP")
                cb = ttk.Combobox(f_frame, textvariable=cat_var, values=["CB", "SD EP", "SD EV"], width=6, state="readonly")
                cb.pack(side=tk.LEFT)
                self.manual_categories[key] = cb

        actions_frame = ttk.Frame(gerador_frame)
        actions_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(actions_frame, text="1. GERAR PRÉVIA", command=self.gerar_escala, style="Accent.TButton").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.btn_confirm = ttk.Button(actions_frame, text="2. CONFIRMAR", command=self.confirmar_escala, state=tk.DISABLED)
        self.btn_confirm.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Button(actions_frame, text="LIMPAR CAMPOS", command=self.limpar_campos_manuais).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
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
        ttk.Button(btn_frame, text="Excluir Escala Selecionada", command=self.excluir_historico).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        ttk.Button(btn_frame, text="Imprimir Selecionada", command=self.imprimir_historico).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        
        view_frame = ttk.LabelFrame(paned, text="Detalhes da Escala", padding="10")
        paned.add(view_frame, weight=2)
        
        self.text_hist_details = tk.Text(view_frame, wrap=tk.WORD, font=("Consolas", 14))
        self.text_hist_details.pack(fill=tk.BOTH, expand=True)

    def setup_tab_ranking(self):
        ranking_frame = ttk.Frame(self.tab_ranking, padding="10")
        ranking_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(ranking_frame, text="Ranking de Cansaço (Pontuação Acumulada)", font=("Segoe UI", 16, "bold")).pack(pady=(0, 10))
        
        cols = ("Soldado", "Pontos Preta", "Pontos Vermelha", "Total")
        self.tree_ranking = ttk.Treeview(ranking_frame, columns=cols, show='headings')
        
        for col in cols:
            self.tree_ranking.heading(col, text=col)
            self.tree_ranking.column(col, width=150, anchor=tk.CENTER)
            
        self.tree_ranking.pack(fill=tk.BOTH, expand=True)
        
        ttk.Button(ranking_frame, text="Atualizar Ranking", command=self.atualizar_ranking).pack(pady=10)

    def atualizar_ranking(self):
        for item in self.tree_ranking.get_children():
            self.tree_ranking.delete(item)
            
        pessoas_db = self.current_state.get('pessoas', {})
        historico = self.current_state.get('historico_escalas', [])
        
        # Calcula pontos dinamicamente do histórico
        p_preta, p_vermelha, _, _, _ = calculate_points(historico, list(pessoas_db.keys()))
        
        ranking_list = []
        for p in pessoas_db:
            preta = p_preta.get(p, 0)
            vermelha = p_vermelha.get(p, 0)
            total = preta + vermelha
            ranking_list.append((p, preta, vermelha, total))
            
        # Ordena pelo total (mais cansados primeiro)
        ranking_list.sort(key=lambda x: x[3], reverse=True)
        
        for entry in ranking_list:
            self.tree_ranking.insert('', tk.END, values=entry)

    def setup_tab_config(self):
        config_frame = ttk.LabelFrame(self.tab_config, text="Configurações da Unidade", padding="20")
        config_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(config_frame, text="Nome do Comandante (Capitão):", font=("Segoe UI", 12)).pack(anchor=tk.W, pady=(0, 5))
        self.entry_cmt = ttk.Entry(config_frame, font=("Segoe UI", 12))
        self.entry_cmt.pack(fill=tk.X, pady=(0, 15))
        self.entry_cmt.insert(0, self.current_state.get('nome_cmt', "RENAN LOUREIRO LENTZ - Cap"))

        ttk.Label(config_frame, text="Subunidade Atual:", font=("Segoe UI", 12)).pack(anchor=tk.W, pady=(0, 5))
        self.combo_unidade = ttk.Combobox(config_frame, values=["BC", "1BO", "2BO"], font=("Segoe UI", 12), state="readonly")
        self.combo_unidade.pack(fill=tk.X, pady=(0, 15))
        self.combo_unidade.set(self.current_state.get('unidade', "BC"))
        
        ttk.Label(config_frame, text="Nome do Sargenteante:", font=("Segoe UI", 12)).pack(anchor=tk.W, pady=(0, 5))
        self.entry_sgte = ttk.Entry(config_frame, font=("Segoe UI", 12))
        self.entry_sgte.pack(fill=tk.X, pady=(0, 15))
        self.entry_sgte.insert(0, self.current_state.get('nome_sgte', "HEBERT CARLOS VIANA - 2° Sgt"))
        
        # Novos campos para números de Aditamento e Boletim
        nums_frame = ttk.Frame(config_frame)
        nums_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(nums_frame, text="Nr Aditamento:", font=("Segoe UI", 11)).grid(row=0, column=0, sticky=tk.W, padx=5)
        self.entry_nr_adit = ttk.Entry(nums_frame, width=10, font=("Segoe UI", 11))
        self.entry_nr_adit.grid(row=0, column=1, sticky=tk.W, padx=5)
        self.entry_nr_adit.insert(0, self.current_state.get('nr_aditamento', "___"))
        
        ttk.Label(nums_frame, text="Nr Boletim Interno:", font=("Segoe UI", 11)).grid(row=0, column=2, sticky=tk.W, padx=5)
        self.entry_nr_bol = ttk.Entry(nums_frame, width=10, font=("Segoe UI", 11))
        self.entry_nr_bol.grid(row=0, column=3, sticky=tk.W, padx=5)
        self.entry_nr_bol.insert(0, self.current_state.get('nr_boletim', "___"))
        
        # --- QUANTITATIVOS ---
        counts_frame = ttk.LabelFrame(self.tab_config, text="Quantitativos de Serviço (Vagas)", padding="20")
        counts_frame.pack(fill=tk.X, pady=10)
        
        q_grid = ttk.Frame(counts_frame)
        q_grid.pack(fill=tk.X)
        
        req = self.current_state.get('req_counts', {})
        
        ttk.Label(q_grid, text="Guarda:").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.entry_req_guarda = ttk.Entry(q_grid, width=5)
        self.entry_req_guarda.grid(row=0, column=1, sticky=tk.W, padx=5)
        self.entry_req_guarda.insert(0, str(req.get('guarda', 24)))
        
        ttk.Label(q_grid, text="Plantão:").grid(row=0, column=2, sticky=tk.W, padx=5, pady=5)
        self.entry_req_plantao = ttk.Entry(q_grid, width=5)
        self.entry_req_plantao.grid(row=0, column=3, sticky=tk.W, padx=5)
        self.entry_req_plantao.insert(0, str(req.get('plantao', 6)))
        
        ttk.Label(q_grid, text="Apoio HT:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.entry_req_apoio = ttk.Entry(q_grid, width=5)
        self.entry_req_apoio.grid(row=1, column=1, sticky=tk.W, padx=5)
        self.entry_req_apoio.insert(0, str(req.get('apoio', 2)))
        
        ttk.Label(q_grid, text="Sobreaviso:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        self.entry_req_sa = ttk.Entry(q_grid, width=5)
        self.entry_req_sa.grid(row=1, column=3, sticky=tk.W, padx=5)
        self.entry_req_sa.insert(0, str(req.get('sobre_aviso', 2)))
        
        ttk.Button(config_frame, text="Salvar Configurações", command=self.salvar_config, style="Accent.TButton").pack(fill=tk.X, pady=10)

    def salvar_config(self):
        self.current_state['nome_cmt'] = self.entry_cmt.get().strip()
        self.current_state['nome_sgte'] = self.entry_sgte.get().strip()
        self.current_state['nr_aditamento'] = self.entry_nr_adit.get().strip()
        self.current_state['nr_boletim'] = self.entry_nr_bol.get().strip()
        self.current_state['unidade'] = self.combo_unidade.get()
        
        # Salvar quantitativos
        try:
            self.current_state['req_counts'] = {
                'guarda': int(self.entry_req_guarda.get()),
                'plantao': int(self.entry_req_plantao.get()),
                'apoio': int(self.entry_req_apoio.get()),
                'sobre_aviso': int(self.entry_req_sa.get())
            }
        except:
            messagebox.showwarning("Aviso", "Valores de quantitativos inválidos. Usando padrões.")
            
        self.save_state(self.current_state)
        self.atualizar_labels_quantitativos()
        messagebox.showinfo("Sucesso", "Configurações salvas com sucesso!")

    def atualizar_labels_quantitativos(self):
        req = self.current_state.get('req_counts', {})
        if hasattr(self, 'chk_guarda'):
            self.chk_guarda.config(text=f"Incluir GUARDA ({req.get('guarda', 24)})")
        if hasattr(self, 'chk_plantao'):
            self.chk_plantao.config(text=f"Incluir PLANTÃO ({req.get('plantao', 6)})")
        if hasattr(self, 'chk_apoio'):
            self.chk_apoio.config(text=f"Incluir APOIO ({req.get('apoio', 2)})")
        if hasattr(self, 'chk_sobre_aviso'):
            self.chk_sobre_aviso.config(text=f"Incluir SOBRE AVISO ({req.get('sobre_aviso', 2)})")


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
            
            tags = []
            if pessoas_db[k].get('is_po', False):
                tags.append("[PO]")
            if pessoas_db[k].get('is_sargentiacao', False):
                tags.append("[SGTE]")
            
            tag_str = (" " + " ".join(tags)) if tags else ""
            self.listbox_pessoas.insert(tk.END, f"{k} - {status}{tag_str}")

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

    def alternar_po_pessoa(self):
        selection = self.listbox_pessoas.curselection()
        if not selection: return
        p = self.listbox_pessoas.get(selection[0]).split(" - ")[0]
        pessoas_db = self.current_state.get('pessoas', {})
        if p in pessoas_db:
            pessoas_db[p]['is_po'] = not pessoas_db[p].get('is_po', False)
            self.save_state(self.current_state)
            self.atualizar_lista_pessoas()

    def alternar_sargentiacao_pessoa(self):
        selection = self.listbox_pessoas.curselection()
        if not selection: return
        p = self.listbox_pessoas.get(selection[0]).split(" - ")[0]
        pessoas_db = self.current_state.get('pessoas', {})
        if p in pessoas_db:
            pessoas_db[p]['is_sargentiacao'] = not pessoas_db[p].get('is_sargentiacao', False)
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
        self.var_sobre_aviso.set(False)
        self.var_sem_expediente.set(prox_dia.weekday() >= 5)
        
        if hasattr(self, 'manual_entries'):
            for key, entry in self.manual_entries.items():
                entry.delete(0, tk.END)

    def gerar_escala(self):
        target_date = self.get_next_date()
        has_g = self.var_guarda.get()
        has_p = self.var_plantao.get()
        has_a = self.var_apoio.get()
        has_sa = self.var_sobre_aviso.get()
        sem_exp = self.var_sem_expediente.get()
        
        if not has_g and not has_p and not has_a and not has_sa:
            return messagebox.showerror("Erro", "Selecione pelo menos uma função.")

        try:
            target_str = target_date.strftime("%Y-%m-%d")
            
            guarda_comp_hoje = {}
            for k, entry in self.manual_entries.items():
                guarda_comp_hoje[k] = entry.get().strip() or "-"
            
            # Categorias
            for k, cb in self.manual_categories.items():
                guarda_comp_hoje[k + "_cat"] = cb.get()

            result, new_state = generate_daily_schedule(
                target_date, has_g, has_p, has_a, has_sa, self.dispensas, self.current_state, 
                req_counts=self.current_state.get('req_counts', {})
            )
            
            result['sem_expediente'] = sem_exp
            if new_state.get('historico_escalas'):
                new_state['historico_escalas'][-1]['sem_expediente'] = sem_exp
            
            result['guarda_comp'] = guarda_comp_hoje
            if new_state.get('historico_escalas'):
                new_state['historico_escalas'][-1]['guarda_comp'] = guarda_comp_hoje
            
            self.schedule_result = result
            self.preview_state = new_state
            
            self.text_details.delete("1.0", tk.END)
            self.text_details.insert(tk.END, f"--- ESCALA PRÉVIA: {target_date.strftime('%d/%m/%Y')} ---\n\n")
            
            self.text_details.insert(tk.END, "--- PREENCHIMENTO MANUAL ---\n")
            for label, key in self.funcoes_list:
                val = guarda_comp_hoje.get(key, "-")
                self.text_details.insert(tk.END, f"{label}: {val}\n")
            self.text_details.insert(tk.END, "\n")
            
            if has_g:
                self.text_details.insert(tk.END, f"GUARDA ({len(result['guarda'])}): {', '.join(result['guarda'])}\n\n")
                
            if has_p: self.text_details.insert(tk.END, f"PLANTÃO ({len(result['plantao'])}): {', '.join(result['plantao'])}\n\n")
            if has_a: self.text_details.insert(tk.END, f"APOIO HT/PARIA ({len(result['apoio'])}): {', '.join(result['apoio'])}\n\n")
            if has_sa: self.text_details.insert(tk.END, f"SOBRE AVISO ({len(result['sobre_aviso'])}): {', '.join(result['sobre_aviso'])}\n\n")
            
            self.btn_confirm.config(state=tk.NORMAL)
            self.btn_print.config(state=tk.DISABLED)
            
        except Exception as e:
            messagebox.showerror("Erro", f"Erro:\n{str(e)}")

    def confirmar_escala(self):
        if not self.preview_state: return
        if messagebox.askyesno("Confirmar", "Confirmar esta escala e avançar o dia?"):
            self.current_state = self.preview_state
            
            # Incrementar automaticamente Nr Aditamento e Boletim
            try:
                curr_adit = self.current_state.get('nr_aditamento', '0')
                if curr_adit.isdigit():
                    self.current_state['nr_aditamento'] = str(int(curr_adit) + 1)
                    if hasattr(self, 'entry_nr_adit'):
                        self.entry_nr_adit.delete(0, tk.END)
                        self.entry_nr_adit.insert(0, self.current_state['nr_aditamento'])
                
                curr_bol = self.current_state.get('nr_boletim', '0')
                if curr_bol.isdigit():
                    self.current_state['nr_boletim'] = str(int(curr_bol) + 1)
                    if hasattr(self, 'entry_nr_bol'):
                        self.entry_nr_bol.delete(0, tk.END)
                        self.entry_nr_bol.insert(0, self.current_state['nr_boletim'])
            except Exception as e:
                print("Erro ao incrementar números:", e)

            self.save_state(self.current_state)
            self.btn_confirm.config(state=tk.DISABLED)
            self.btn_print.config(state=tk.NORMAL)
            self.atualizar_data_alvo()
            self.atualizar_lista_historico()
            self.atualizar_ranking()
            if messagebox.askyesno("Imprimir", "Deseja imprimir agora?"):
                self.imprimir_escala(self.schedule_result)

    def limpar_campos_manuais(self):
        for entry in self.manual_entries.values():
            entry.delete(0, tk.END)
        for var in self.manual_categories.values():
            var.set("SD EP")
        messagebox.showinfo("Sucesso", "Campos manuais limpos.")

    def imprimir_escala(self, item=None):
        if not item: item = self.schedule_result
        if not item: return
        try:
            gen = DocumentGenerator(self.current_state, self.get_resource_path)
            docx_file = gen.generate(item)
            os.startfile(docx_file)
        except Exception as e:
            messagebox.showerror("Erro de Impressão", f"Erro:\n{e}")

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
        
        if 'guarda_comp' in item:
            gc = item['guarda_comp']
            self.text_hist_details.insert(tk.END, "--- PREENCHIMENTO MANUAL ---\n")
            for label, key in self.funcoes_list:
                val = gc.get(key, "-")
                self.text_hist_details.insert(tk.END, f"{label}: {val}\n")
            self.text_hist_details.insert(tk.END, "\n")
            
        if item.get('has_guarda'): 
            self.text_hist_details.insert(tk.END, f"GUARDA ({len(item.get('guarda', []))}): {', '.join(item.get('guarda', []))}\n\n")
            
        if item.get('has_plantao'): self.text_hist_details.insert(tk.END, f"PLANTÃO ({len(item['plantao'])}): {', '.join(item['plantao'])}\n\n")
        if item.get('has_apoio'): self.text_hist_details.insert(tk.END, f"APOIO HT/PARIA ({len(item['apoio'])}): {', '.join(item['apoio'])}\n\n")
        if item.get('has_sobre_aviso'): self.text_hist_details.insert(tk.END, f"SOBRE AVISO ({len(item.get('sobre_aviso', []))}): {', '.join(item.get('sobre_aviso', []))}\n\n")

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

    def imprimir_historico(self):
        selection = self.listbox_historico.curselection()
        if not selection: 
            return messagebox.showwarning("Aviso", "Selecione uma escala no histórico primeiro.")
        
        idx = int(self.listbox_historico.get(selection[0]).split(" - ")[0])
        historico = self.current_state.get('historico_escalas', [])
        
        if idx >= len(historico): return
        
        self.imprimir_escala(historico[idx])

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    sv_ttk.set_theme("dark")
    root.mainloop()
