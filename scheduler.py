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

def calculate_points(historico, pessoas_keys, target_date=None):
    if target_date is None:
        target_date = datetime.date.today()
        
    pontos_preta = {p: 0 for p in pessoas_keys}
    pontos_vermelha = {p: 0 for p in pessoas_keys}
    recent_duties_count = {p: 0 for p in pessoas_keys}
    last_weekend_worked = {p: None for p in pessoas_keys}
    last_worked_date = {p: None for p in pessoas_keys}
    active_in_last_30_days = set()
    
    peso_guarda = 3
    peso_plantao = 2
    peso_apoio = 1
    
    historico_ordenado = sorted(historico, key=lambda x: parse_dt(x['data']))
    for reg in historico_ordenado:
        dt = parse_dt(reg['data'])
        if not dt: continue
        wkdy = dt.weekday()
        is_reg_vermelha = wkdy in [4, 5, 6]
        is_we = (wkdy == 5 or wkdy == 6)
        c_week = get_week_number(dt)
        
        days_diff = (target_date - dt).days
        is_recent = 0 < days_diff <= 7
        is_active = 0 < days_diff <= 30
        
        def process_duty(person_list, peso):
            for p in person_list:
                p = str(p)
                if p not in pessoas_keys: continue
                if is_active: active_in_last_30_days.add(p)
                
                if is_reg_vermelha: pontos_vermelha[p] += peso
                else: pontos_preta[p] += peso
                
                last_worked_date[p] = dt
                if is_we: last_weekend_worked[p] = c_week
                if is_recent: recent_duties_count[p] += 1
                
        process_duty(reg.get('guarda', []), peso_guarda)
        process_duty(reg.get('plantao', []), peso_plantao)
        process_duty(reg.get('apoio', []), peso_apoio)

    avg_preta = 0
    avg_vermelha = 0
    if active_in_last_30_days:
        avg_preta = sum(pontos_preta[p] for p in active_in_last_30_days) / len(active_in_last_30_days)
        avg_vermelha = sum(pontos_vermelha[p] for p in active_in_last_30_days) / len(active_in_last_30_days)
        
    for p in pessoas_keys:
        threshold_preta = max(0, avg_preta - peso_guarda)
        if pontos_preta[p] < threshold_preta:
            pontos_preta[p] = threshold_preta
            
        threshold_vermelha = max(0, avg_vermelha - peso_guarda)
        if pontos_vermelha[p] < threshold_vermelha:
            pontos_vermelha[p] = threshold_vermelha
            
    return pontos_preta, pontos_vermelha, recent_duties_count, last_weekend_worked, last_worked_date

def generate_daily_schedule(target_date, has_guarda, has_plantao, has_apoio, dispensas, current_state):
    pessoas_db = copy.deepcopy(current_state.get('pessoas', {}))
    historico = current_state.get('historico_escalas', [])
    
    pontos_preta, pontos_vermelha, recent_duties_count, last_weekend_worked, last_worked_date = calculate_points(historico, list(pessoas_db.keys()), target_date)

    weekday = target_date.weekday()
    is_meio_semana = weekday in [0, 1, 2, 3]

    available = []
    for p_str, p_data in pessoas_db.items():
        if not p_data.get('ativo', True):
            continue
            
        if p_data.get('is_po', False) and is_meio_semana:
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
            
    is_weekend = (weekday == 5 or weekday == 6)
    current_week = get_week_number(target_date)
    delta = datetime.timedelta(days=1)
    
    target_is_vermelha = weekday in [4, 5, 6]
    
    scores = {}
    for p in available:
        base_score = pontos_vermelha[p] if target_is_vermelha else pontos_preta[p]
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
    
    remaining_candidates = list(candidates)
    
    for p in list(remaining_candidates):
        if len(selected_guarda) >= req_guarda: break
        is_sargentiacao = pessoas_db.get(p, {}).get('is_sargentiacao', False)
        if is_sargentiacao and is_meio_semana: continue
        selected_guarda.append(p)
        remaining_candidates.remove(p)

    for p in list(remaining_candidates):
        if len(selected_plantao) >= req_plantao: break
        selected_plantao.append(p)
        remaining_candidates.remove(p)

    for p in list(remaining_candidates):
        if len(selected_apoio) >= req_apoio: break
        is_sargentiacao = pessoas_db.get(p, {}).get('is_sargentiacao', False)
        if is_sargentiacao and is_meio_semana: continue
        selected_apoio.append(p)
        remaining_candidates.remove(p)

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
