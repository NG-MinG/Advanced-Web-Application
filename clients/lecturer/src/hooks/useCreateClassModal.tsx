import { useState } from 'react';
import { faBookOpenReader, faChalkboardTeacher, faSection } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Form, Input, Modal } from "antd";

interface useCreateClassModalProps {
    handleCreate: (...args: any[]) => void;
    handleCancel: () => void;
}

const useCreateClassModal = ({ handleCreate, handleCancel }: useCreateClassModalProps) => {
    const [form] = Form.useForm();

    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreateModal = () => {
        form.validateFields()
        .then(async (values: any) => { 
            setLoading(true);
            
            await handleCreate(values);
            
            setLoading(false);
            handleCancelModal();
        })
        .catch((err: any) => {
            console.log(err);
        });
    }

    const handleCancelModal = async () => { 
        await handleCancel();

        setOpenCreateModal(false);
        form.resetFields();
    };

    const ModalContext = (
        openCreateModal ? 
        <Modal
            className="!text-center"
            title={<b className="font-semibold text-2xl ml-4 text-primary py-3 block"><FontAwesomeIcon icon={faBookOpenReader} size="lg" />&nbsp; Create new class</b>}
            centered
            open={openCreateModal}
            onOk={handleCreateModal}
            confirmLoading={loading}
            onCancel={handleCancelModal}
            closable={false}
            okText="Create"
            cancelButtonProps={{ disabled: loading, className: "!px-4 !py-2 !w-auto !h-auto !font-medium", danger: true, type: "primary" }}
            okButtonProps={{ className: "!px-4 !py-2 !w-auto !h-auto !font-medium mr-1" }}
            maskClosable={!loading}>
            <Form autoComplete='off' form={form} layout="vertical" className="!mt-8 !px-1 !text-left flex flex-col gap-3">
                <Form.Item
                    name='class_name'
                    label={
                        <span className="flex justify-center items-center font-medium">
                            <FontAwesomeIcon icon={faChalkboardTeacher} />&nbsp;
                            Class name
                        </span>
                    }
                    rules={[{ required: true, message: 'A class must have a name !' }]}
                >
                    <Input placeholder="Enter class name" className="!p-2.5 !px-4" />
                </Form.Item>
                <Form.Item 
                    name='class_section'
                    label={
                        <span className="flex justify-center items-center font-medium">
                            <FontAwesomeIcon icon={faSection} />&nbsp;
                            Section
                        </span>
                    }
                >
                    <Input placeholder="Enter section" className="!p-2.5 !px-4" />
                </Form.Item>
            </Form>
        </Modal>
        : null
    );

    return { openCreateModal, setOpenCreateModal, loading, setLoading, ModalContext };
}

export default useCreateClassModal;