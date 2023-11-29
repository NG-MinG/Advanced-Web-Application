import React, { useMemo, useRef, useState } from 'react';

import { Button, Dropdown, Empty, Form, Input, MenuProps, Upload, message } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClose, faCloudArrowUp, faDownload, faEdit, faEllipsisV, faTrash } from '@fortawesome/free-solid-svg-icons';
import { NavLink, useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';
import authStorage from '~/utils/auth.storage';
import { ClassType, uploadStudentList } from '~/store/reducers/classSlice';
import useAppDispatch from '~/hooks/useAppDispatch';
import { ActionType, EditableProTable, ProColumns } from '@ant-design/pro-components';

const StudentList: React.FC = () => {
    const [details] = useOutletContext<[ClassType]>();
    const { classID } = useParams();

    const [form] = Form.useForm();

    const actionRef = useRef<ActionType>();

    const [messageApi, holderContext] = message.useMessage();
    const [isLoading, setIsLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isUpload, setIsUpload] = useState(false);

    interface StudentListStructure {
        key: string;
        student_id: string;
        full_name: string;
        email: string;
        user?: string;
    }
    
    const data: StudentListStructure[] = useMemo(() => {
        if (details) {
            const studentList = details?.studentList?.map((item, index) => {
                return {
                    key: `${item._id}`,
                    student_id: item.student_id,
                    full_name: item.full_name,
                    email: item.email,
                    index,
                    user: item?.user,
                    no: index + 1,
                }
            });
            
            return studentList;
        }
        return [];
    }, [details]);

    const [dataSource, setDataSource] = useState<StudentListStructure[]>(data);

    const dispatch = useAppDispatch();

    const items: MenuProps["items"] = [
        {
            key: "export-student-list",
            label: 'Student list template',
            icon: <FontAwesomeIcon icon={faDownload} />,
            className: "!px-4 !py-2.5 !text-md !gap-1",
            onClick: () => {
                axios.get("https://res.cloudinary.com/daa7j5ohx/raw/upload/v1/templates/jlbowebvuyc8tytx0sgy.xlsx", {
                    responseType: "blob",
                }).then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    
                    link.href = url;
                    link.setAttribute('download', 'student_list_template.xlsx');
                    
                    link.click();
                }).catch(err => {
                    messageApi.error(err.message);
                });
            }
        },
        {
            key: "upload-student-list",
            label: 'Student list',
            icon: <FontAwesomeIcon icon={faCloudArrowUp} />,
            className: "!px-4 !py-2.5 !text-md !gap-1",
            onClick: () => setIsUpload(true),
        },
    ];

    const handleUploadFile = (options: any) => { 
        setIsLoading(true);

        const { onSuccess, onError, file, onProgress } = options;
        
        const formData = new FormData();
        formData.append("studentlist", file);
        
        axios.put(`${process.env.REACT_APP_BACKEND_HOST}/v1/student-list/${classID}/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                'Authorization': authStorage.isLogin() ? `Bearer ${authStorage.getAccessToken()}` : ''
            },
            onUploadProgress: (event: any) => onProgress({ percent: (event.loaded / event.total) * 100 })
        })
        .then((response: any) => {
            messageApi.success(`Student list upload successfully`, 1, () => {
                dispatch(uploadStudentList({
                    classID: classID!,
                    studentList: response.data.data
                }));
            });
            
            onSuccess(response.data.data);
        })
        .catch((error) => { 
            messageApi.error(`Upload failed`);
            onError({ error });
        })
        .finally(() => {
            setIsLoading(false);
        });
    };
    
    const handleRemove = (key: React.Key) => {
        setDataSource(prev => prev.filter((item) => item.key !== key));
    }

    const handleEdit = () => {
        form.validateFields()
        .then((formData: any) => {
            const updatedData = [...dataSource];
            
            const sortedNewData = updatedData.map((data, index) => {
                const newData: any = (Object.values(formData)).find((el: any) => el.action.key === data.key);

                updatedData[index].student_id = newData?.student_id;
                updatedData[index].full_name = newData?.full_name;
                updatedData[index].email = newData?.email;

                return {
                    ...updatedData[index]
                }
            });

            setDataSource(sortedNewData);

            setIsLoading(true);
            axios.put(`${process.env.REACT_APP_BACKEND_HOST}/v1/student-list/${classID}`, 
            {
                studentList: sortedNewData,
            }, 
            {
                headers: {
                    Authorization: authStorage.isLogin() ? `Bearer ${authStorage.getAccessToken()}` : '',
                }
            })
            .then(res => {
                messageApi.success('Student list updated successfully', 1, () => {
                    dispatch(uploadStudentList({
                        classID: classID!,
                        studentList: res.data.data,
                    }));
                });
            })
            .catch(err => {
                messageApi.error('Failed to update student list');
                console.log(err);
            })
            .finally(() => {
                setIsLoading(false);
            });
            setIsEdit(false);
        })
        .catch((err) => {
            console.log(err);
        });
    }

    const handleCancelEdit = () => {
        form.resetFields();
        setDataSource(data);
        setIsEdit(false);
    }

    const columns: ProColumns[] = useMemo(() => {

        const extendsColumns: ProColumns = {
            title: '',
            dataIndex: '',
            width: 70,
            className: 'drag-visible',
            key: 'action',
            align: 'center',
            renderFormItem: (_, { record }) => <Button icon={<FontAwesomeIcon icon={faTrash} />} danger ghost onClick={() => handleRemove(record.key)} />,
        };

        const col: ProColumns[] = [
            {
                title: 'N.o',
                key: 'index',
                width: 70,
                align: 'center',
                render: (_, record, index) => record.no,
                renderFormItem: (_, {record}) => <span className='flexa items-center justify-center'><Input className='!invisible !w-0 !h-0 !p-0' />{record.no}</span>,
            }, 
            {
                title: 'Student ID',
                dataIndex: 'student_id',
                className: 'drag-visible !px-3.5',
                width: 170,
                formItemProps: {
                    rules: [
                        {
                            required: true,
                            message: 'Student ID is required',
                        },
                    ],
                },
                render: (_, record) => (record.user) ? <NavLink to={''} className='!text-primary !underline !underline-offset-2'>{record.student_id}</NavLink> : record.student_id,
                renderFormItem: (_, { isEditable }) => isEditable ? <Input allowClear autoComplete='off' className='!p-2 !px-3.5' placeholder='Enter grade name' /> : null,
            },
            {
                title: 'Full name',
                dataIndex: 'full_name',
                className: 'drag-visible',
                width: 370,
                renderFormItem: (_, { isEditable }) => isEditable ? <Input allowClear autoComplete='off' className='!p-2 !px-3.5' placeholder='0%' /> : null,
            },
            {
                title: 'Email',
                dataIndex: 'email',
                className: 'drag-visible',
                renderFormItem: (_, { isEditable }) => isEditable ? <Input allowClear autoComplete='off' className='!p-2 !px-3.5' placeholder='0%' /> : null,
            },
        ];

        if (isEdit) {
            col.push(extendsColumns);
        }

        return col;
    }, [isEdit]);

    const dragableContext = useMemo(() => {
        const editableKeys = isEdit ? dataSource.map((item) => item.key) : [];

        return (
            <EditableProTable<StudentListStructure>
                actionRef={actionRef}
                columns={columns}
                rowKey="key"
                search={false}
                showHeader={true}
                locale={{
                    emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No students" />
                }}
                editable={{
                    form,
                    type: 'multiple',
                    editableKeys
                }}
                showSorterTooltip={true}
                toolBarRender={false}
                pagination={{
                    showSizeChanger: false,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                    pageSize: 10,
                }}
                recordCreatorProps={false}
                value={dataSource}
                loading={isLoading}
                className='mt-2'
            />
        );
    }, [isEdit, columns, dataSource, form, isLoading]);

    return (
        <div className='mt-2'>
            {holderContext}
            <div className='flex justify-between items-center'>
                <h1 className='text-2xl font-medium mb-2'>Student List</h1>
                <div className='flex gap-2'>
                    { data?.length && !isUpload && isEdit 
                        ? 
                        <>
                            <Button title="cancel" icon={<FontAwesomeIcon size='lg' icon={faClose} />} danger onClick={handleCancelEdit} />
                            <Button title="finish" icon={<FontAwesomeIcon size='lg' icon={faCheck} />} type='primary' ghost onClick={handleEdit} />
                        </> 
                        : 
                        data?.length && !isUpload ? <Button title="edit" className='!border-none !shadow-none' icon={<FontAwesomeIcon size='lg' icon={faEdit} />} onClick={() => {
                            if (!isLoading) {
                                setIsEdit(true);
                            }
                        }} /> : null
                    }
                    { isUpload && data?.length ? <Button title="cancel" icon={<FontAwesomeIcon size='lg' icon={faClose} />} danger onClick={() => setIsUpload(false)} /> : null }
                    <div className='flex justify-end'>
                        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight" getPopupContainer={trigger => trigger.parentElement!} overlayClassName='!z-10'>
                            <Button className='!border-none !shadow-none' icon={<FontAwesomeIcon icon={faEllipsisV} size='lg' />} />
                        </Dropdown>
                    </div>
                    {/* <Button className='!text-sm !h-auto !w-auto !px-4 !py-3' icon={<FontAwesomeIcon icon={faDownload} />}>Export Template</Button> */}
                </div>
            </div>
            <hr className='mb-2' />
            { data?.length && !isUpload ? dragableContext : null }
            { 
                !data?.length || isUpload ?
                    <Upload.Dragger disabled={isLoading} name="studentlist" customRequest={handleUploadFile}>
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={'There are no student list found'} />
                        <p className="ant-upload-text">Click or drag file to this area to upload</p>
                        <p className="ant-upload-hint mb-8">Support for a single or bulk upload.</p>
                    </Upload.Dragger>
                :null
            }
        </div>
    )
};

export default StudentList;