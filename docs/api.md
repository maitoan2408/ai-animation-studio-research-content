# API v0.1

Base `http://127.0.0.1:4310/api`; request ghi cần application/json, ≤40 MB. Error: `{"error":{"code":"...","message":"..."}}`; HTTP 409 cho conflict. Schema strict từ chối field lạ.

| Method/path | Contract |
| --- | --- |
| GET /health | ok, workerError? |
| GET /doctor | Runtime thực |
| GET /projects | Project[] |
| POST /projects | {title,script,style,language} → Project |
| GET /projects/:id | project, current revision, revisions, jobs, artifacts, reviews |
| POST /projects/:id/revisions | {expectedRevision,spec} → Revision |
| POST /projects/:id/voice | {expectedRevision} → Revision có voice |
| POST /projects/:id/audio | {expectedRevision,sceneId,base64} → Revision gắn WAV |
| POST /projects/:id/jobs | {revisionId,profile} → Job, 202 |
| GET /projects/:id/preview?frame=24 | SVG current revision, chưa audio envelope |
| GET /projects/:id/export?revision=... | Gói spec + audio; mặc định current |
| POST /import | ProjectPackage → Project mới |
| GET /jobs/:id | Job/progress/attempts |
| POST /jobs/:id/cancel | {}; queued/running |
| POST /jobs/:id/retry | {}; failed/cancelled/interrupted |
| GET /artifacts/:id/video | MP4 hỗ trợ byte range, verify hash |
| POST /artifacts/:id/reviews | {reviewer,decision,notes,frame?} → Review |

Profile preview/final. Decision approved/changes_requested. Frame integer trong [0, frameCount). Không có auto-approval theo render status. Domain validator chính xác tại src/domain.ts; HTTP tại src/server.ts; state transitions tại src/application.ts.

Revision endpoint nhận đầy đủ spec. Client áp dụng patch trong bộ nhớ rồi validate; v0.1 không thực thi JSON Patch/JS tùy ý. Chưa có provider LLM hoặc quyền gọi dịch vụ trả phí.
