import React, { useMemo, useRef, useState } from 'react';

import { Button, Dropdown, Empty, Form, Input, MenuProps, Upload, message } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClose, faCloudArrowUp, faDownload, faEdit, faEllipsisV, faTrash } from '@fortawesome/free-solid-svg-icons';
import { NavLink, useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';
import authStorage from '~/utils/auth.storage';
import { ClassType, uploadStudentList, uploadGradeList } from '~/store/reducers/classSlice';
import useAppDispatch from '~/hooks/useAppDispatch';
import { ActionType, EditableProTable, ProColumns } from '@ant-design/pro-components';

const StudentGradeList: React.FC = () => {
    const [details] = useOutletContext<[ClassType]>();
    const { classID } = useParams();

    const [form] = Form.useForm();

    const actionRef = useRef<ActionType>();

    const [messageApi, holderContext] = message.useMessage();
    const [isLoading, setIsLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isUpload, setIsUpload] = useState(false);

    const data: any[] = useMemo(() => {
        if (details) {
            const studentList = details?.gradeList?.map((item: any, index) => {
                const dataValue: any = {
                    key: `${item._id}`,
                    index,
                    user: item?.user,
                    no: index + 1,
                    cols: details.gradeColumns.map((el: any) => el.name)
                };

                details.studentList.forEach((student: any) => {
                    if (student.student_id === item.student_id) {
                        dataValue.student_id = student.student_id;
                    }
                });

                if (dataValue.student_id) {
                    item.grade.forEach((grade: any) => {
                        dataValue[grade.col] = grade.value;
                    });
                    
                    return dataValue;
                }
            });
            
            return studentList.length && studentList[0] ? studentList : [];
        }
        return [];
    }, [details]);

    const [dataSource, setDataSource] = useState<any[]>(data);

    const dispatch = useAppDispatch();

    const items: MenuProps["items"] = [
        {
            key: "export-student-grade-list",
            label: 'Grade list template',
            icon: <FontAwesomeIcon icon={faDownload} />,
            className: "!px-4 !py-2.5 !text-md !gap-1",
            onClick: () => {
                axios.post(`${process.env.REACT_APP_BACKEND_HOST}/v1/grade/template/export`, {
                    classID: classID,
                }, {
                    headers: {
                        Authorization: authStorage.isLogin() ? `Bearer ${authStorage.getAccessToken()}` : '',
                    },
                    responseType: 'arraybuffer',
                }).then(res => {
                    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = 'grade-list-template.xlsx';
                    link.click();
                }).catch(err => {
                    console.log(err);
                });
            }
        },
        {
            key: "upload-student-grade-list",
            label: 'Grade list',
            icon: <FontAwesomeIcon icon={faCloudArrowUp} />,
            className: "!px-4 !py-2.5 !text-md !gap-1",
            onClick: () => setIsUpload(true),
        },
    ];

    const handleUploadFile = (options: any) => { 
        setIsLoading(true);

        const { onSuccess, onError, file, onProgress } = options;
        
        const formData = new FormData();
        formData.append("gradelist", file);
        
        axios.put(`${process.env.REACT_APP_BACKEND_HOST}/v1/grade/grade-list/${classID}/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                'Authorization': authStorage.isLogin() ? `Bearer ${authStorage.getAccessToken()}` : ''
            },      
            onUploadProgress: (event: any) => onProgress({ percent: (event.loaded / event.total) * 100 })
        })
        .then((response: any) => {
            messageApi.success(`Grade list upload successfully`, 1, () => {
                dispatch(uploadGradeList({
                    classID: classID!,
                    gradeList: response.data.data
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
    
    const handleEdit = () => {
        form.validateFields()
        .then((formData: any) => {
            const updatedData: any[] = [...dataSource];
            
            const sortedNewData = updatedData.map((data, index) => {
                const newData: any = (Object.values(formData)).find((el: any) => el.student_id === data.student_id);

                updatedData[index].student_id = newData?.student_id;
                updatedData[index].grade_name = details.gradeColumns.map((el: any) => el.name);
                updatedData[index].grade = details.gradeColumns.map((el: any) => {
                    return {
                        col: el.name,
                        value: newData[el.name],
                    }
                });

                return {
                    ...updatedData[index]
                }
            });

            setDataSource(sortedNewData);

            setIsLoading(true);
            axios.put(`${process.env.REACT_APP_BACKEND_HOST}/v1/grade/list/${classID}`, 
            {
                gradeList: sortedNewData,
            }, 
            {
                headers: {
                    Authorization: authStorage.isLogin() ? `Bearer ${authStorage.getAccessToken()}` : '',
                }
            })
            .then(res => {
                messageApi.success('Grade list updated successfully', 1, () => {
                    dispatch(uploadGradeList({
                        classID: classID!,
                        gradeList: res.data.data,
                    }));
                });
            })
            .catch(err => {
                messageApi.error('Failed to update grade list');
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

        const studentIdCol: ProColumns = {
            title: 'Student ID',
            dataIndex: 'student_id',
            className: 'drag-visible !px-3.5',
            width: 70,
            formItemProps: {
                rules: [
                    {
                        required: true,
                        message: 'Student ID is required',
                    },
                ],
            },
            render: (_, record) => (record.user) ? <NavLink to={''} className='!text-primary !underline !underline-offset-2'>{record.student_id}</NavLink> : record.student_id,
            renderFormItem: (_, { isEditable, record }) => isEditable ? <span className='flex items-center justify-center'><span>{record.student_id}</span><Input className='!p-0 !m-0 !invisible' /></span> : null,
        };

        const cols: ProColumns[] = data?.length && data[0] ? data[0].cols.map((el: any) => {
            return {
                title: el,
                dataIndex: el,
                className: 'drag-visible',
                width: 70,
                formItemProps: {
                    rules: [
                        {
                            validator: async (_, value, callback) => {
                                try {
                                    if (value < 0 || value > 10) {
                                        throw new Error('Grade must be between 0 and 10');
                                    }
                                    
                                    return Promise.resolve();
                                }
                                catch (err) {
                                    return Promise.reject(err);
                                }
                            }
                        },
                    ],
                },
                renderFormItem: (_, { isEditable }) => isEditable ? <Input allowClear autoComplete='off' className='!p-2 !px-3.5' placeholder='Enter grade name' /> : null,
            } as ProColumns;
        }) : [];

        const col: ProColumns[] = cols ? [studentIdCol, ...cols] : [];

        return col;
    }, [isEdit]);

    const dragableContext = useMemo(() => {
        const editableKeys = isEdit ? dataSource.map((item) => item.key) : [];

        return (
            <EditableProTable<any>
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
                <h1 className='text-2xl font-medium mb-2'>Student Grade List</h1>
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
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={'There are grade list found'} />
                        <p className="ant-upload-text">Click or drag file to this area to upload</p>
                        <p className="ant-upload-hint mb-8">Support for a single or bulk upload.</p>
                    </Upload.Dragger>
                :null
            }
        </div>
    )
};

export default StudentGradeList;
