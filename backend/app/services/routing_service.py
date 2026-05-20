from sqlalchemy.orm import Session

from app.models.doctor import Doctor

SYMPTOM_DEPARTMENT_MAP = {
    "心内科": ["胸闷", "胸痛", "心慌", "心悸", "气短", "喘", "高血压", "血压", "心脏", "心痛", "晕厥", "头晕", "乏力"],
    "内分泌科": ["血糖", "糖尿病", "甲亢", "甲减", "甲状腺", "尿酸", "痛风", "肥胖", "体重", "代谢", "多饮", "多尿", "多食", "消瘦"],
    "儿科": ["发烧", "发热", "咳嗽", "流涕", "感冒", "腹泻", "呕吐", "出疹", "小孩", "孩子", "宝宝", "婴儿", "儿童", "发育", "疫苗"],
    "中医科": ["舌苔", "脉象", "气血", "阴虚", "阳虚", "上火", "湿气", "调理", "体质", "经络", "针灸", "中药"],
    "药学": ["吃药", "用药", "药物", "过敏", "禁忌", "OTC", "处方药", "副作用", "剂量", "服药", "消炎药", "抗生素"],
}


def _base_query(db: Session, hospital_id: int = None):
    q = db.query(Doctor).filter(Doctor.status == "online")
    if hospital_id:
        q = q.filter(Doctor.hospital_id == hospital_id)
    return q


def match_doctor(db: Session, symptom: str = "", department: str = "", hospital_id: int = None):
    base = _base_query(db, hospital_id)

    if department:
        doctors = base.filter(Doctor.department == department).all()
        if doctors:
            return doctors[0]

    if symptom:
        for dept, keywords in SYMPTOM_DEPARTMENT_MAP.items():
            if any(kw in symptom for kw in keywords):
                doctors = base.filter(Doctor.department == dept).all()
                if doctors:
                    return doctors[0]

    doctor = base.filter(Doctor.department == "全科").first()
    if doctor:
        return doctor

    return base.first()
