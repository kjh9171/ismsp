import React, { useEffect, useState } from 'react';
import { Layout, Table, Button, Card, Row, Col, Typography, Tag, Modal, Input, Progress, Space, Select, message } from 'antd';
import { EditOutlined, FilePdfOutlined, HistoryOutlined, DashboardOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const App = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedRound, setSelectedRound] = useState("최초");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [description, setDescription] = useState('');
  const [evidenceName, setEvidenceName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/isms-items?year=${selectedYear}&round_name=${selectedRound}`);
      const sRes = await axios.get('http://localhost:8000/api/statistics');
      setItems(res.data);
      setStats(sRes.data);
    } catch (err) { message.error("데이터 로드 실패"); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedYear, selectedRound]);

  // PDF 출력 함수
  const handleExportPDF = () => {
    window.open(`http://localhost:8000/api/export-pdf?year=${selectedYear}&round_name=${selectedRound}`, '_blank');
  };

  const handleSave = async () => {
    try {
      await axios.post('http://localhost:8000/api/save-item', {
        id: selectedItem.id,
        year: selectedYear,
        round_name: selectedRound,
        description,
        evidence_name: evidenceName
      });
      message.success("저장되었습니다.");
      setIsModalOpen(false);
      loadData();
    } catch (err) { message.error("저장 실패"); }
  };

  const columns = [
    { title: '번호', dataIndex: 'id', key: 'id', width: 70, align: 'center' },
    { 
      title: '인증 항목 및 상세 기준', 
      key: 'detail', 
      width: 450,
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#1890ff' }}>{r.item_name}</Text>
          <div style={{ marginTop: '5px', padding: '8px', background: '#f5f5f5', fontSize: '12px', borderRadius: '4px' }}>{r.content}</div>
        </div>
      )
    },
    { title: '운영 현황', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '증적자료', dataIndex: 'evidence_name', key: 'evidence_name', width: 120, render: (t) => t !== '-' ? <Tag color="blue">{t}</Tag> : '-' },
    { title: '상태', dataIndex: 'status', key: 'status', width: 90, align: 'center', render: (s) => <Tag color={s === '작성완료' ? 'green' : 'orange'}>{s}</Tag> },
    { title: '작성', key: 'action', width: 60, align: 'center', render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => {
      setSelectedItem(r);
      setDescription(r.description !== '-' ? r.description : '');
      setEvidenceName(r.evidence_name !== '-' ? r.evidence_name : '');
      setIsModalOpen(true);
    }} /> }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>🛡️ ISMS-P 통합 관리 시스템</Title>
        <Space>
          <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 100 }}>
            {["2024", "2025", "2026"].map(y => <Option key={y} value={y}>{y}년</Option>)}
          </Select>
          <Select value={selectedRound} onChange={setSelectedRound} style={{ width: 120 }}>
            {["최초", "사후 1차", "사후 2차", "갱신심사"].map(r => <Option key={r} value={r}>{r}</Option>)}
          </Select>
          <Button type="primary" danger icon={<FilePdfOutlined />} onClick={handleExportPDF}>PDF 출력</Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Row gutter={16}>
          <Col span={16}>
            <Card title={<Space><HistoryOutlined /> 연도별/심사별 이행률 추이</Space>} style={{ marginBottom: 20, height: '220px' }}>
              <Row gutter={16} justify="start">
                {stats.length > 0 ? stats.map(s => (
                  <Col key={s.label} style={{ textAlign: 'center', marginRight: 20 }}>
                    <Progress type="circle" percent={s.percent} size={80} />
                    <div style={{ marginTop: 8 }}><Text strong>{s.label}</Text></div>
                  </Col>
                )) : <Text type="secondary">데이터를 입력하면 추이가 생성됩니다.</Text>}
              </Row>
            </Card>
          </Col>
          <Col span={8}>
            <Card title={<Space><DashboardOutlined /> 진척도</Space>} style={{ marginBottom: 20, height: '220px' }}>
              <div style={{ textAlign: 'center' }}>
                <Progress percent={Math.round((items.filter(i => i.status === '작성완료').length / 102) * 100)} status="active" />
                <Title level={3} style={{ marginTop: 20 }}>{items.filter(i => i.status === '작성완료').length} / 102 완료</Title>
              </div>
            </Card>
          </Col>
        </Row>

        <Table dataSource={items} columns={columns} loading={loading} rowKey="id" bordered pagination={{ pageSize: 10 }} />

        <Modal title={`[${selectedItem?.id}] 상세 작성`} open={isModalOpen} onOk={handleSave} onCancel={() => setIsModalOpen(false)} width={750}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>인증 기준:</Text>
                <div style={{ background: '#f5f5f5', padding: '10px' }}>{selectedItem?.content}</div>
                <Input placeholder="증적 자료명" value={evidenceName} onChange={e => setEvidenceName(e.target.value)} />
                <TextArea rows={6} placeholder="운영 현황" value={description} onChange={e => setDescription(e.target.value)} />
            </Space>
        </Modal>
      </Content>
    </Layout>
  );
};

export default App;