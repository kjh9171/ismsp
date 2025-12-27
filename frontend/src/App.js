import React, { useEffect, useState } from 'react';
import { Layout, Table, Button, Card, Row, Col, Typography, Tag, Modal, Input, Upload, message, Progress, Space, Alert } from 'antd';
import { RobotOutlined, UploadOutlined, FilePdfOutlined, EditOutlined, DashboardOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const App = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [description, setDescription] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [analysis, setAnalysis] = useState(null); 

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/isms-items');
      setItems(res.data);
    } catch (err) { message.error("데이터 로딩 실패"); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // --- 추가/수정된 로직: 작성 모달 열기 ---
  const handleOpenModal = (item) => {
    setSelectedItem(item);
    
    // 1. 증적 자료명 자동 입력: 방금 업로드한 AI 분석 파일명이 있으면 그것을 사용, 없으면 기존 데이터 사용
    const autoEvidence = analysis?.filename || (item.evidence_name !== '-' ? item.evidence_name : '');
    setEvidenceName(autoEvidence);

    // 2. 운영 현황 AI 초안 생성: 기존 내용이 없을 때만 생성
    if (!item.description || item.description === '-') {
      const draft = `[AI 자동 생성 초안]
1. 정책 수립: 본 조직은 ${item.item_name}를 위해 관련 정보보호 지침을 수립하여 운영하고 있습니다.
2. 이행 현황: 업로드된 증적(${autoEvidence || '관련 문서'})을 바탕으로 정기 점검 및 관리를 수행합니다.
3. 증거 매핑: 해당 지침 제 3조(관리)항에 의거하여 본 항목을 준수하고 있습니다.`;
      setDescription(draft);
    } else {
      setDescription(item.description);
    }

    setIsModalOpen(true);
  };

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === '작성완료').length;
  const progressRatio = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleSave = async () => {
    try {
      await axios.post('http://localhost:8000/api/save-item', {
        id: selectedItem.id,
        description: description,
        evidence_name: evidenceName
      });
      message.success("저장되었습니다.");
      setIsModalOpen(false);
      setAnalysis(null); // 저장 후 다음 작업을 위해 분석 상태 초기화(선택사항)
      loadData();
    } catch (err) { message.error("저장 실패"); }
  };

  const uploadProps = {
    name: 'file',
    action: 'http://localhost:8000/api/ai/analyze-evidence',
    onChange(info) {
      if (info.file.status === 'done') {
        setAnalysis(info.file.response);
        message.success(`${info.file.name} 분석 완료! 이제 작성 버튼을 누르세요.`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 업로드 실패.`);
      }
    },
  };

  const columns = [
    { title: '번호', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
    { 
      title: '분류 (대/중)', 
      key: 'category', 
      width: 140,
      render: (_, r) => (
        <div style={{ fontSize: '11px' }}>
          <Tag color="blue">{r.main_cat}</Tag>
          <div style={{ marginTop: '4px', color: '#888' }}>{r.sub_cat}</div>
        </div>
      )
    },
    { 
      title: '인증 항목 및 상세 기준', 
      key: 'content', 
      width: 280,
      render: (_, r) => (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          <Text strong style={{ fontSize: '13px' }}>{r.item_name}</Text><br/>
          <Text type="secondary" style={{ fontSize: '11px' }}>{r.content}</Text>
        </div>
      )
    },
    { 
      title: '운영 현황 (작성내용)', 
      dataIndex: 'description', 
      key: 'description',
      render: (text) => <div style={{ whiteSpace: 'pre-wrap', color: '#555', fontSize: '12px' }}>{text || '-'}</div>
    },
    { 
      title: '증적자료명', 
      dataIndex: 'evidence_name', 
      key: 'evidence_name',
      width: 130,
      render: (name) => name !== '-' ? <Tag color="cyan">{name}</Tag> : '-'
    },
    { 
      title: '상태', 
      dataIndex: 'status', 
      key: 'status',
      width: 90,
      align: 'center',
      render: (status) => (
        <Tag color={status === '작성완료' ? 'green' : 'volcano'}>{status}</Tag>
      )
    },
    { 
      title: '결과', 
      key: 'result',
      width: 80,
      align: 'center',
      render: (_, r) => (
        <Text type={r.status === '작성완료' ? 'success' : 'danger'} strong>
          {r.status === '작성완료' ? '완료' : '작업중'}
        </Text>
      )
    },
    { 
      title: '작성', 
      key: 'action', 
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(r)} />
      ) 
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>🛡️ ISMS-P 관리 AI 플랫폼</Title>
        <Button type="primary" danger icon={<FilePdfOutlined />} onClick={() => window.open('http://localhost:8000/api/export-pdf')}>
          PDF 보고서 출력
        </Button>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={14}>
            <Card title={<Space><DashboardOutlined />전체 준비 진척률</Space>} bordered={false} style={{ height: '100%' }}>
              <Progress percent={progressRatio} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} strokeWidth={15} />
              <div style={{ marginTop: 10, textAlign: 'right' }}><Text strong>{completedItems} / {totalItems} 항목 완료</Text></div>
            </Card>
          </Col>
          <Col span={10}>
            <Card title={<Space><RobotOutlined />증적 분석 AI</Space>} bordered={false} style={{ height: '100%' }}>
              <Upload {...uploadProps} showUploadList={false}>
                <Button icon={<UploadOutlined />} type="primary" ghost>증적 파일 업로드 분석</Button>
              </Upload>
              {analysis && (
                <Alert style={{ marginTop: 15 }} message="분석 완료" description={`파일명: ${analysis.filename} (추천 항목: ${analysis.recommended_item})`} type="info" showIcon />
              )}
            </Card>
          </Col>
        </Row>

        <Card title="인증 통제 항목 리스트" bodyStyle={{ padding: 0 }}>
          <Table dataSource={items} columns={columns} loading={loading} rowKey="id" bordered pagination={{ pageSize: 10 }} />
        </Card>

        <Modal title={`[${selectedItem?.id}] 상세 작성`} open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleSave} width={800} okText="저장">
          <div style={{ marginBottom: 15 }}>
            <Text strong>인증 기준:</Text>
            <div style={{ background: '#fafafa', padding: '10px', marginTop: 5, borderRadius: 4, fontSize: '12px', border: '1px solid #eee' }}>{selectedItem?.content}</div>
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong>증적 자료명 (자동입력):</Text>
              <Input value={evidenceName} onChange={e => setEvidenceName(e.target.value)} placeholder="분석된 파일명이 자동으로 입력됩니다" />
            </div>
            <div>
              <Text strong>운영 현황 (AI 초안):</Text>
              <TextArea rows={8} value={description} onChange={e => setDescription(e.target.value)} placeholder="AI가 생성한 초안을 수정하여 사용하세요" />
            </div>
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
};

export default App;