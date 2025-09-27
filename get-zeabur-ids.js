#!/usr/bin/env node

const fetch = require('node-fetch');

const ZEABUR_TOKEN = 'sk-43y654qlt5ldvrcjj63cpxc4doc27';
const GRAPHQL_ENDPOINT = 'https://gateway.zeabur.com/graphql';

async function getZeaburIds() {
  try {
    console.log('🔍 正在獲取 Zeabur 項目信息...');
    
    const query = `
      query {
        user {
          id
          name
          email
        }
        projects {
          edges {
            node {
              id
              name
              environment
              services {
                edges {
                  node {
                    id
                    name
                    template
                    environment
                    domains {
                      domain
                      isGenerated
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZEABUR_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return;
    }

    console.log('✅ 成功獲取數據！');
    console.log('\n👤 用戶信息:');
    console.log(`   姓名: ${data.data.user.name}`);
    console.log(`   Email: ${data.data.user.email}`);
    console.log(`   ID: ${data.data.user.id}`);

    console.log('\n📋 項目列表:');
    data.data.projects.edges.forEach(project => {
      const proj = project.node;
      console.log(`\n🏗️  項目: ${proj.name}`);
      console.log(`   ID: ${proj.id}`);
      console.log(`   環境: ${proj.environment}`);
      
      if (proj.name.includes('proposal') || proj.name.includes('generator')) {
        console.log('   ⭐ 這可能是你的 proposal-generator 項目！');
        console.log(`   📝 ZEABUR_PROJECT_ID=${proj.id}`);
      }
      
      console.log('   📦 服務:');
      proj.services.edges.forEach(service => {
        const svc = service.node;
        console.log(`      - ${svc.name} (ID: ${svc.id})`);
        console.log(`        Template: ${svc.template || 'Custom'}`);
        console.log(`        Environment: ${svc.environment}`);
        
        if (svc.domains && svc.domains.length > 0) {
          console.log(`        Domains:`);
          svc.domains.forEach(domain => {
            console.log(`          - ${domain.domain} ${domain.isGenerated ? '(Generated)' : '(Custom)'}`);
            if (domain.domain.includes('proposal-generator.zeabur.app')) {
              console.log(`          ⭐ 找到目標域名！`);
              console.log(`          📝 ZEABUR_SERVICE_ID=${svc.id}`);
            }
          });
        }
      });
    });

    // 查找 proposal-generator 項目
    const proposalProject = data.data.projects.edges.find(p => 
      p.node.name.toLowerCase().includes('proposal') || 
      p.node.name.toLowerCase().includes('generator')
    );

    if (proposalProject) {
      console.log('\n🎯 建議的 GitHub Secrets:');
      console.log(`ZEABUR_TOKEN=${ZEABUR_TOKEN}`);
      console.log(`ZEABUR_PROJECT_ID=${proposalProject.node.id}`);
      
      const proposalService = proposalProject.node.services.edges.find(s => 
        s.node.domains && s.node.domains.some(d => d.domain.includes('proposal-generator'))
      );
      
      if (proposalService) {
        console.log(`ZEABUR_SERVICE_ID=${proposalService.node.id}`);
      } else {
        console.log('ZEABUR_SERVICE_ID=<需要手動從 Zeabur dashboard 獲取>');
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.log('\n📋 手動獲取步驟:');
    console.log('1. 前往 https://zeabur.com/dashboard');
    console.log('2. 選擇你的 proposal-generator 項目');
    console.log('3. 在 URL 中找到 PROJECT_ID: https://zeabur.com/projects/[PROJECT_ID]');
    console.log('4. 點擊服務，在 URL 中找到 SERVICE_ID: https://zeabur.com/projects/[PROJECT_ID]/services/[SERVICE_ID]');
  }
}

getZeaburIds();