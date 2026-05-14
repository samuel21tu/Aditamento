import datetime
import random
import copy

def get_week_number(date_obj):
    return date_obj.isocalendar()[:2]

def parse_dt(v):
    if isinstance(v, str): 
        try:
            return datetime.datetime.strptime(v, "%Y-%m-%d").date()
        except:
            return None
    return v

def generate_daily_schedule(target_date, has_guarda, has_plantao, has_apoio, dispensas, current_state):
    pessoas_db = copy.deepcopy(current_state.get('pessoas', {}))
    historico = current_state.get('historico_escalas', [])
    
    # Reconstruir métricas a partir do histórico
    guarda_counts = {p: 0 for p in pessoas_db}
    plantao_counts = {p: 0 for p in pessoas_db}
    apoio_counts = {p: 0 for p in pessoas_db}
    recent_duties_count = {p: 0 for p in pessoas_db}
    last_weekend_worked = {p: None for p in pessoas_db}
    last_worked_date = {p: None for p in pessoas_db}
    
    # Processar o histórico ordenado por data
    historico_ordenado = sorted(historico, key=lambda x: parse_dt(x['data']))
    for reg in historico_ordenado:
        dt = parse_dt(reg['data'])
        wkdy = dt.weekday()
        is_we = (wkdy == 5 or wkdy == 6)
        c_week = get_week_number(dt)
        is_recent = 0 < (target_date - dt).days <= 7
        
        for p in reg.get('guarda', []):
            p = str(p)
            if p in guarda_counts:
                guarda_counts[p] += 1
                last_worked_date[p] = dt
                if is_we: last_weekend_worked[p] = c_week
                if is_recent: recent_duties_count[p] += 1
                
        for p in reg.get('plantao', []):
            p = str(p)
            if p in plantao_counts:
                plantao_counts[p] += 1
                last_worked_date[p] = dt
                if is_we: last_weekend_worked[p] = c_week
                if is_recent: recent_duties_count[p] += 1
                
        for p in reg.get('apoio', []):
            p = str(p)
            if p in apoio_counts:
                apoio_counts[p] += 1
                last_worked_date[p] = dt
                if is_we: last_weekend_worked[p] = c_week
                if is_recent: recent_duties_count[p] += 1

    available = []
    for p_str, p_data in pessoas_db.items():
        if not p_data.get('ativo', True):
            continue
            
        p_int = int(p_str)
        is_dispensado = False
        if p_int in dispensas:
            for d_start, d_end in dispensas[p_int]:
                if d_start <= target_date <= d_end:
                    is_dispensado = True
                    break
        if not is_dispensado:
            available.append(p_str)
            
    weekday = target_date.weekday()
    is_weekend = (weekday == 5 or weekday == 6)
    current_week = get_week_number(target_date)
    delta = datetime.timedelta(days=1)
    
    peso_guarda = 3
    peso_plantao = 2
    peso_apoio = 1
    
    scores = {}
    for p in available:
        base_score = (guarda_counts.get(p, 0) * peso_guarda) + \
                     (plantao_counts.get(p, 0) * peso_plantao) + \
                     (apoio_counts.get(p, 0) * peso_apoio)
        recent_penalty = recent_duties_count.get(p, 0) * 15
        consec_penalty = 0
        if last_worked_date.get(p) == target_date - delta:
            consec_penalty = 50
        scores[p] = base_score + recent_penalty + consec_penalty
    
    def filter_candidates(cands, block_consec_days, block_consec_weekends):
        valid = []
        for p in cands:
            if block_consec_days and last_worked_date.get(p) == target_date - delta:
                continue
            if block_consec_weekends and is_weekend:
                last_we = last_weekend_worked.get(p)
                if last_we:
                    ly, lw = last_we
                    cy, cw = current_week
                    if ly == cy and lw == cw - 1:
                        continue
                    elif ly == cy - 1 and lw == 52 and cw == 1:
                        continue
            valid.append(p)
        return valid

    req_guarda = 24 if has_guarda else 0
    req_plantao = 6 if has_plantao else 0
    req_apoio = 2 if has_apoio else 0
    total_req = req_guarda + req_plantao + req_apoio
    
    # Estratégia de Relaxamento de Regras
    candidates = filter_candidates(available, block_consec_days=True, block_consec_weekends=True)
    if len(candidates) < total_req:
        candidates = filter_candidates(available, block_consec_days=False, block_consec_weekends=True)
    if len(candidates) < total_req:
        candidates = filter_candidates(available, block_consec_days=False, block_consec_weekends=False)
    if len(candidates) < total_req:
        candidates = list(available)
        
    random.shuffle(candidates)
    candidates.sort(key=lambda x: scores[x])
    
    selected_guarda = []
    selected_plantao = []
    selected_apoio = []
    
    if len(candidates) >= total_req:
        selected_guarda = candidates[:req_guarda]
        selected_plantao = candidates[req_guarda:req_guarda+req_plantao]
        selected_apoio = candidates[req_guarda+req_plantao:req_guarda+req_plantao+req_apoio]
    else:
        selected_guarda = candidates[:req_guarda]
        rest = candidates[req_guarda:]
        selected_plantao = rest[:req_plantao]
        rest2 = rest[req_plantao:]
        selected_apoio = rest2[:req_apoio]

    result_data = {
        'data': target_date.strftime("%Y-%m-%d"),
        'dia_semana': weekday,
        'guarda': selected_guarda,
        'plantao': selected_plantao,
        'apoio': selected_apoio,
        'has_guarda': has_guarda,
        'has_plantao': has_plantao,
        'has_apoio': has_apoio
    }
        
    new_state = copy.deepcopy(current_state)
    if 'historico_escalas' not in new_state:
        new_state['historico_escalas'] = []
    
    # Opcional: Adicionar na memória do preview, mas o app.py vai gerenciar a confirmação
    new_state['historico_escalas'].append(result_data)
        
    return result_data, new_state
