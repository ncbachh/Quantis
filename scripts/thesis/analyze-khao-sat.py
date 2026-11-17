import json, sys
from pathlib import Path
from collections import Counter
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
repo_root = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(repo_root/"backend-python"))
from fastapi.testclient import TestClient
from main import app

qa=Path(sys.argv[1]).resolve()
assets=qa
d=json.loads((qa/"user-demo-frontend.json").read_text(encoding="utf-8"))
client=TestClient(app)
items=d["masked"][0][:-1]
def post(endpoint,payload):
    res=client.post(f"/api/quantis/analyze/{endpoint}",json=payload)
    res.raise_for_status()
    return res.json().get("result",res.json())
paf=post("paf",dict(rows=d["masked"],columnNames=items))
mice=post("impute-mice",dict(rows=d["masked"],columns=items,variables={k:{"decimals":0,"measure":"ordinal"} for k in items},m=5,maxIter=10,randomState=42))
ols=post("ols",dict(rows=d["scored"],yCol="gpa_tu_bao_cao",xCols=["DIEM_TS","DIEM_NT"]))
assert paf["nFactors"]==2 and ols["diagnostics"]["ok"]
assert len(mice["imputedDatasets"])==5
for table in mice["imputedDatasets"]:
 assert len(table)==len(d["masked"]) and all(all(row[:-1]) for row in table[1:])
 for observed, filled in zip(d["masked"][1:],table[1:]):
  assert all(not x or x==y for x,y in zip(observed,filled))
complete=np.array([[float(c) for c in r] for r in d["scored"][1:] if all(r)])
y=complete[:,0]
X=np.column_stack([np.ones(len(y)),complete[:,1:]])
beta=np.linalg.lstsq(X,y,rcond=None)[0]
q=np.array([ols["coefficients"][k] for k in ["(Intercept)","DIEM_TS","DIEM_NT"]])
assert np.max(np.abs(beta-q))<1e-8
alpha_ref={}
for key,columns in [("a",range(5)),("b",range(5,10))]:
 a=np.array([[float(r[i]) for i in columns] for r in d["masked"][1:] if all(r[i] for i in columns)])
 alpha=a.shape[1]/(a.shape[1]-1)*(1-a.var(axis=0,ddof=1).sum()/a.sum(axis=1).var(ddof=1))
 alpha_ref[key]=dict(alpha=alpha,n=len(a),absDiff=abs(alpha-d[key]["alpha"]))
 assert alpha_ref[key]["absDiff"]<1e-10
pca_mat=np.array([[float(c) for c in r[:-1]] for r in d["masked"][1:] if all(r[:-1])])
pca_reference=np.linalg.eigvalsh(np.corrcoef(pca_mat,rowvar=False))[::-1]
assert np.max(np.abs(pca_reference - d["pca"]["eigenvalues"])) < 1e-8

plt.rcParams.update({"font.family":"DejaVu Sans","font.size":10,"axes.spines.top":False,"axes.spines.right":False,"axes.labelcolor":"#23384b","text.color":"#172736","xtick.color":"#23384b","ytick.color":"#23384b"})
def fig_new(size=(7.2,3.8)):
 return plt.subplots(figsize=size,layout="constrained")
def save(fig,name):
 fig.savefig(assets/name,dpi=240,facecolor="white")
 plt.close(fig)
fig,ax=fig_new()
x=np.arange(1,len(items)+1)
ax.axhline(0,color="#c5cbd2",lw=.9)
ax.plot(x,paf["screeEigenvalues"],"o-",label="Dữ liệu quan sát",color="#1d405e",lw=2,markersize=5)
ax.plot(x,paf["parallelCutoff"],"s--",label="Phân vị 95% sau hoán vị",color="#a5532d",lw=1.6,markersize=4)
ax.axvspan(.75,2.25,color="#e3eef4",zorder=0)
ax.set(xticks=x,xlabel="Thứ hạng trị riêng",ylabel="Trị riêng rút gọn")
ax.legend(frameon=False)
save(fig,"fig-4-1.png")

fig,ax=fig_new((7.2,3.5))
agg=d["agg"]
means=[g["metrics"]["mean"] for g in agg]
errors=[g["metrics"]["ci95Upper"]-g["metrics"]["mean"] for g in agg]
labels=[f'{g["name"]}\nn = {g["metrics"]["count"]}' for g in agg]
xx=np.arange(len(agg))
ax.errorbar(xx,means,yerr=errors,fmt="o",color="#1d405e",ecolor="#39627e",capsize=5,linewidth=1.6)
ax.set(xticks=xx,xticklabels=labels,xlabel="Năm học",ylabel="Điểm TS trung bình",ylim=(1,5),xlim=(-.45,len(agg)-.55))
ax.grid(axis="y",alpha=.2)
save(fig,"fig-4-2.png")

diag=ols["diagnostics"]
obs=diag["observations"] if "observations" in diag else diag["obs"]
fig,ax=fig_new((7.2,3.5))
ax.scatter(obs["fitted"],obs["resid"],alpha=.58,s=18,color="#245371",edgecolors="none")
ax.axhline(0,color="#aa572e",linestyle="--",lw=1.2)
ax.set(xlabel="GPA dự đoán",ylabel="Phần dư")
ax.grid(alpha=.16)
save(fig,"fig-4-3.png")

summary={k:d[k] for k in ("inputN","missing","yearValues","a","b","agg","history","timing")}
summary.update(alphaRef=alpha_ref,pcaReference=pca_reference.tolist(),pca=d["pca"],paf={k:paf.get(k) for k in ("nUsed","suggestedCount","nFactors","varianceBefore","varianceAfter","loadings","rotation")},mice=dict(m=mice["m"],iterations=mice["iterations"],stats=mice["rubinStatistics"]),ols={k:ols[k] for k in ("n","nInput","nDropped","r2","adjR2","coefficients","se","pValue","ciLower","ciUpper")},diagnostics=diag["assumptions"],olsMaxAbsDiff=float(np.max(np.abs(beta-q))))
(qa/"user-demo-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
