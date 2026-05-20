import json
import os

import bcrypt

from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.user import User

SEED_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "seed_doctors.json")


def seed_all(db):
    # 医院
    if db.query(Hospital).count() == 0:
        db.add_all([
            Hospital(name="北京协和医院", code="bjxhyy", address="北京市东城区", phone="010-69156114"),
            Hospital(name="上海华山医院", code="shhsyy", address="上海市静安区", phone="021-52889999"),
        ])
        db.commit()

    # 用户
    if db.query(User).count() == 0:
        users = [
            User(hospital_id=None, username="admin", password_hash=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode(),
                 name="超级管理员", role="super_admin"),
            User(hospital_id=1, username="wang_yuanzhang", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="王院长", role="hospital_admin"),
            User(hospital_id=1, username="doctor_zhang", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="张医生", role="doctor", specialty="心内科"),
            User(hospital_id=1, username="doctor_li", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="李医生", role="doctor", specialty="内分泌科"),
            User(hospital_id=1, username="patient_wang", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="王小明", role="patient", phone="13800138000"),
            User(hospital_id=2, username="doctor_chen_sh", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="陈医生", role="doctor", specialty="全科"),
            User(hospital_id=2, username="patient_li_si", password_hash=bcrypt.hashpw("123456".encode(), bcrypt.gensalt()).decode(),
                 name="李四", role="patient", phone="13900139000"),
        ]
        db.add_all(users)
        db.commit()

    # AI 医生
    if db.query(Doctor).count() == 0:
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            doctors_data = json.load(f)

        # 协和: 李主任(心内)、张医生(内分泌)、王大夫(儿科)、陈医生(全科)
        # 华山: 赵大夫(中医)、刘药师(药学)、陈医生(全科)
        hospital_map = [1, 1, 1, 2, 1, 2]  # 按 JSON 顺序分配
        for i, d in enumerate(doctors_data):
            db.add(Doctor(
                hospital_id=hospital_map[i],
                name=d["name"],
                department=d["department"],
                avatar_url=d["department"],  # 前端用 department 映射 SVG 图标
                specialty=d["specialty"],
                personality=d["personality"],
                system_prompt=d["system_prompt"],
            ))
        db.commit()
