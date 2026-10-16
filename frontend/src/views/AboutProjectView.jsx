import React from 'react';

export default function AboutProjectView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2>About Food Verse AI</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Capstone Project for the NASSCOM FutureSkills Generative AI with Google Cloud Program.
        </p>
      </div>

      {/* Program & Project Summary Card */}
      <div className="card">
        <div className="card-header-clean">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--green-deep)', textTransform: 'uppercase' }}>
              Academic & Industry Alignment
            </span>
            <h3>Program Charter & Objectives</h3>
          </div>
          <span className="ai-pill-tag">Google Cloud Capstone</span>
        </div>

        <p style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
          <strong>Food Verse AI</strong> is an intelligent, multi-modal culinary and nutritional intelligence platform built to demonstrate advanced generative AI engineering. The application bridges visual perception (plate and ingredient photo recognition) with personalized dietary intelligence and kitchen resource management.
        </p>

        <div className="grid-cols-3" style={{ marginTop: '1.25rem' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📸</div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Multi-Modal Vision</h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Identifies prepared dishes, raw ingredients, and portion gram weights using Google Gemini 1.5 Flash Vision.
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👨‍🍳</div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Zero-Waste Cooking</h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Synthesizes tailored recipes strictly from currently available pantry ingredients and dietary filters.
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🥗</div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Grounded Nutrition</h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Cross-references AI estimations with deterministic USDA reference tables to eliminate health hallucinations.
            </p>
          </div>
        </div>
      </div>

      {/* Unresolved Cloud Deployment Decision Card */}
      <div className="card" style={{ borderColor: 'var(--orange-border)' }}>
        <div className="card-header-clean" style={{ borderColor: 'var(--orange-border)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--orange-primary)', textTransform: 'uppercase' }}>
              Architecture Clarification Note
            </span>
            <h3 style={{ color: 'var(--orange-primary)' }}>Unresolved Deployment Decision: Google Cloud vs. AWS CLI</h3>
          </div>
          <span className="ai-pill-tag" style={{ background: 'var(--bg-orange-subtle)', color: 'var(--orange-primary)' }}>
            Engineering Decision Record
          </span>
        </div>

        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-body)', marginBottom: '1rem' }}>
          <strong>Context:</strong> A program discrepancy exists where the internship is under the <em>NASSCOM FutureSkills Generative AI with Google Cloud</em> program, but upstream project assignment templates mention the <em>AWS CLI</em>.
        </p>

        <div style={{ background: 'var(--bg-orange-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--orange-border)', fontSize: '0.88rem', color: '#9a3412', lineHeight: 1.5 }}>
          <strong>Engineering Mitigation:</strong> The application follows strict 12-Factor principles and OCI Docker containerization:
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li><strong>Primary Target (Google Cloud):</strong> Deployed to Google Cloud Run with Google Cloud Vertex AI / Gemini API and Cloud SQL.</li>
            <li><strong>Secondary Fallback (AWS):</strong> The identical Docker container images run on AWS App Runner / Amazon ECS using the AWS CLI with zero code rewrites.</li>
          </ul>
        </div>
      </div>

      {/* Full Tech Stack Breakdown */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Technical Stack & Verification Standards</h3>

        <div className="grid-cols-2">
          <div>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--green-deep)', marginBottom: '0.5rem' }}>
              Frontend Engineering:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
              <li><strong>Framework:</strong> React 19 SPA bundled via Vite</li>
              <li><strong>Styling:</strong> Pure Vanilla CSS with custom design tokens (no Tailwind)</li>
              <li><strong>Typography:</strong> Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono)</li>
              <li><strong>State:</strong> AppContext with persistent localStorage backing</li>
              <li><strong>Accessibility:</strong> WCAG 2.1 AA contrast, keyboard navigation, and visible focus rings</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '0.92rem', color: 'var(--green-deep)', marginBottom: '0.5rem' }}>
              Backend & AI Architecture:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.86rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
              <li><strong>API Framework:</strong> Python 3.13 with FastAPI & Uvicorn</li>
              <li><strong>Validation:</strong> Pydantic v2 Settings and request/response models</li>
              <li><strong>Security:</strong> MIME header verification, EXIF stripping, and CORS controls</li>
              <li><strong>AI Layer:</strong> Pluggable <code>BaseAIProvider</code> with Google Gemini & Mock offline mode</li>
              <li><strong>Testing:</strong> Automated pytest suite with async HTTP integration tests</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Documentation Index */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Planning Documents Index</h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          The project plan, system architecture, feature specifications, and implementation checklists are maintained in the repository:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong>docs/PROJECT_PLAN.md</strong>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Scope, milestones & risk matrix</div>
          </div>
          <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong>docs/ARCHITECTURE.md</strong>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Diagrams, ERD & security model</div>
          </div>
          <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong>docs/FEATURES.md</strong>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Core vs optional schemas & acceptance</div>
          </div>
          <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <strong>docs/DEVELOPMENT_CHECKLIST.md</strong>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Verification gates & task tracking</div>
          </div>
        </div>
      </div>
    </div>
  );
}
