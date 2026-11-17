# M6 integration checkpoint: sources are NOT a completed G1-G6 gate

- Parents: PR #18 `b6521f6c218c5ff3b18cc705eca3b47ae5250527` and PR #19 `f0e9c676b36b19c28fcc8f8d7eaac100b6934e68`; merge base `901bb7a1ba83f68ed04e822f1fdf8efe023770d2`.
- This merge retains the later PR #18 G3 physics/render/quality and ports earlier PR #19 M3 generalized two-hand grip/asset validation, native visual gate and three-scene work.
- Conflicts resolved by preserving PR #18 generalized data contract and G3 art rig while adding M3 optional left-grip compatibility; M6 critic retains frame-level QA and resolves hand from project data. PR #19's earlier generalization plan is superseded by PR #18's expanded G3 requirements, not silently overwritten.
- Gate at integration creation: `INTEGRATION_UNVERIFIED`. G3 demands exact-final-SHA real CI+artifacts and separate post-result review; G4-G6 are not implemented. No inference of user aesthetic acceptance.
- Required: run root + production + M4/M5/M6 + G1-G3 workflows at this merge commit; inspect 1080p24 media, FFmpeg decode, grip/release/penetration, random seek, provenance, invalid-case rejection. Keep failed histories; do not merge main or start M7.
