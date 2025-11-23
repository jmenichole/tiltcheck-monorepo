import React from 'react';
import Layout from '@theme/Layout';
import { RedocStandalone } from 'redoc';

export default function OpenAPI() {
  return (
    <Layout title="API" description="TiltCheck OpenAPI Reference">
      <div style={{maxWidth:'1200px', margin:'0 auto', padding:'1rem'}}>
        <h1>API Reference</h1>
        <p>Generated from OpenAPI spec. Placeholder endpoints until spec completed.</p>
        <RedocStandalone specUrl="/openapi/tiltcheck.yaml" options={{ hideDownloadButton: true, noAutoAuth: true }} />
      </div>
    </Layout>
  );
}
