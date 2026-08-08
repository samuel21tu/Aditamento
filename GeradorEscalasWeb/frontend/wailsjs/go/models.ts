export namespace backend {
	
	export class RoleConfig {
	    name: string;
	    weight: number;
	    required: number;
	    service_type?: string;
	    destinado_a?: string;
	    aptos?: string[];
	
	    static createFrom(source: any = {}) {
	        return new RoleConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.weight = source["weight"];
	        this.required = source["required"];
	        this.service_type = source["service_type"];
	        this.destinado_a = source["destinado_a"];
	        this.aptos = source["aptos"];
	    }
	}
	export class Refeicoes {
	    c: boolean;
	    a: boolean;
	    j: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Refeicoes(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.c = source["c"];
	        this.a = source["a"];
	        this.j = source["j"];
	    }
	}
	export class HistoricoArranchamento {
	    data: string;
	    refeicoes: Record<string, Refeicoes>;
	
	    static createFrom(source: any = {}) {
	        return new HistoricoArranchamento(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.refeicoes = this.convertValues(source["refeicoes"], Refeicoes, true);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoricoEscala {
	    data: string;
	    dia_semana: number;
	    escalados?: Record<string, Array<string>>;
	    sem_expediente?: boolean;
	    guarda_comp?: Record<string, string>;
	    manual_roles?: Record<string, string>;
	    boletim_nr?: string;
	    aditamento_nr?: number;
	    boletim_interno_nr?: number;
	    instrucao_nome?: string;
	    instrucao_horario?: string;
	    instrucao_fardamento?: string;
	    assuntos_gerais_text?: string;
	    assuntos_admin_text?: string;
	    atividade_tipo?: string;
	    parada_diaria?: string;
	    justica_disciplina_text?: string;
	    guarda?: string[];
	    plantao?: string[];
	    plantao_ep?: string[];
	    plantao_ev?: string[];
	    apoio?: string[];
	    sobre_aviso?: string[];
	
	    static createFrom(source: any = {}) {
	        return new HistoricoEscala(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.dia_semana = source["dia_semana"];
	        this.escalados = source["escalados"];
	        this.sem_expediente = source["sem_expediente"];
	        this.guarda_comp = source["guarda_comp"];
	        this.manual_roles = source["manual_roles"];
	        this.boletim_nr = source["boletim_nr"];
	        this.aditamento_nr = source["aditamento_nr"];
	        this.boletim_interno_nr = source["boletim_interno_nr"];
	        this.instrucao_nome = source["instrucao_nome"];
	        this.instrucao_horario = source["instrucao_horario"];
	        this.instrucao_fardamento = source["instrucao_fardamento"];
	        this.assuntos_gerais_text = source["assuntos_gerais_text"];
	        this.assuntos_admin_text = source["assuntos_admin_text"];
	        this.atividade_tipo = source["atividade_tipo"];
	        this.parada_diaria = source["parada_diaria"];
	        this.justica_disciplina_text = source["justica_disciplina_text"];
	        this.guarda = source["guarda"];
	        this.plantao = source["plantao"];
	        this.plantao_ep = source["plantao_ep"];
	        this.plantao_ev = source["plantao_ev"];
	        this.apoio = source["apoio"];
	        this.sobre_aviso = source["sobre_aviso"];
	    }
	}
	export class Pessoa {
	    ativo: boolean;
	    apenas_semana?: boolean;
	    apenas_fim_de_semana?: boolean;
	    is_ep?: boolean;
	    foi_de_rota?: boolean;
	    posto_grad?: string;
	    is_po?: boolean;
	    is_sargentiacao?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Pessoa(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ativo = source["ativo"];
	        this.apenas_semana = source["apenas_semana"];
	        this.apenas_fim_de_semana = source["apenas_fim_de_semana"];
	        this.is_ep = source["is_ep"];
	        this.foi_de_rota = source["foi_de_rota"];
	        this.posto_grad = source["posto_grad"];
	        this.is_po = source["is_po"];
	        this.is_sargentiacao = source["is_sargentiacao"];
	    }
	}
	export class AppState {
	    unidade: string;
	    pessoas: Record<string, Pessoa>;
	    historico_escalas: HistoricoEscala[];
	    historico_arranchamentos?: HistoricoArranchamento[];
	    dispensas_v2: Record<string, Array<Dispensa>>;
	    dispensas?: Record<string, Array<Array<string>>>;
	    nome_cmt: string;
	    nome_sgte: string;
	    aditamento_nr: number;
	    boletim_interno_nr: number;
	    role_configs: Record<string, RoleConfig>;
	
	    static createFrom(source: any = {}) {
	        return new AppState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.unidade = source["unidade"];
	        this.pessoas = this.convertValues(source["pessoas"], Pessoa, true);
	        this.historico_escalas = this.convertValues(source["historico_escalas"], HistoricoEscala);
	        this.historico_arranchamentos = this.convertValues(source["historico_arranchamentos"], HistoricoArranchamento);
	        this.dispensas_v2 = this.convertValues(source["dispensas_v2"], Array<Dispensa>, true);
	        this.dispensas = source["dispensas"];
	        this.nome_cmt = source["nome_cmt"];
	        this.nome_sgte = source["nome_sgte"];
	        this.aditamento_nr = source["aditamento_nr"];
	        this.boletim_interno_nr = source["boletim_interno_nr"];
	        this.role_configs = this.convertValues(source["role_configs"], RoleConfig, true);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Dispensa {
	    inicio: string;
	    fim: string;
	
	    static createFrom(source: any = {}) {
	        return new Dispensa(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.inicio = source["inicio"];
	        this.fim = source["fim"];
	    }
	}
	export class GenerateOpts {
	    TargetDate: string;
	    EnabledRoles: string[];
	
	    static createFrom(source: any = {}) {
	        return new GenerateOpts(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.TargetDate = source["TargetDate"];
	        this.EnabledRoles = source["EnabledRoles"];
	    }
	}
	
	
	
	
	
	export class ScoreData {
	    pontos_preta: Record<string, number>;
	    pontos_vermelha: Record<string, number>;
	    recent_duties_count: Record<string, number>;
	    last_weekend_worked: Record<string, number>;
	    last_weekend_worked_year: Record<string, number>;
	    last_worked_date: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new ScoreData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pontos_preta = source["pontos_preta"];
	        this.pontos_vermelha = source["pontos_vermelha"];
	        this.recent_duties_count = source["recent_duties_count"];
	        this.last_weekend_worked = source["last_weekend_worked"];
	        this.last_weekend_worked_year = source["last_weekend_worked_year"];
	        this.last_worked_date = source["last_worked_date"];
	    }
	}

}

