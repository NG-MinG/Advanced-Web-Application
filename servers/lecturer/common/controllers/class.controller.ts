import ClassModel, { IClass } from './../models/class.model';
import { CreateClassDTO } from './../dtos/create-class.dto';
import { NextFunction, Request, Response, Router } from "express";
import IController from "../interfaces/controller";
import catchAsync from "../utils/catch.error";
import { AuthController } from ".";
import DTOValidation from "../middlewares/validation.middleware";
import AppError from "../services/errors/app.error";
import cacheMiddleware from '../middlewares/cache.middleware';
import redis from '../redis';
import GMailer from '../services/mailer.builder';
import path from 'path';
import handlebars from 'handlebars';
import * as fs from 'fs';
import InviteClassDTO from '../dtos/invite-class.dto';
import Jwt from '../utils/jwt';
import JoinClassDTO from '../dtos/join-class';
import mongoose from 'mongoose';

/*
 CLASS CONTROLLER 
1. CREATE CLASS
2. GET ALL CLASS CREATED & JOINED
*/

class ClassController implements IController {
    path: string = "/classes";
    router: Router = Router();

    public classCacheKey(req: Request): string {
        return `class?id=${req.body.id}&owner=${req.user?.id}`;
    }

    constructor() {
        this.router.post('/', DTOValidation.validate<CreateClassDTO>(CreateClassDTO), AuthController.protect, catchAsync(this.createClass));

        this.router.param('id', DTOValidation.extractParams(['id']));
        this.router.get('/:id?', AuthController.protect, cacheMiddleware(this.classCacheKey, this.classCacheRes), catchAsync(this.getClass));

        this.router.post('/invite/:id', DTOValidation.validate<InviteClassDTO>(InviteClassDTO), AuthController.protect, this.ownerProtect, catchAsync(this.sendInvitedMessage));
        this.router.post('/join/:id', DTOValidation.validate<JoinClassDTO>(JoinClassDTO), AuthController.protect, this.invitedProtect, catchAsync(this.joinClass));
    }

    private classCacheRes = async (req: Request, res: Response, next: NextFunction, data: any) => {
        if (req.body.id)
            return res.status(200).json({
                status: 'success',
                message: 'Get class successfully',
                data: data
            });

        res.status(200).json({
            status: 'success',
            message: 'Get classes successfully',
            data: data || []
        });  
    };

    private getClass = async (req: Request, res: Response, next: NextFunction) => { 
        if (req.body?.id) {
            const classArr = await ClassModel.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'lecturers',
                        foreignField: '_id',
                        as: 'lecturers',
                    },
                },
                {   
                    $lookup: {
                        from: 'users',
                        localField: 'students',
                        foreignField: '_id',
                        as: 'students',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'owner',
                        foreignField: '_id',
                        as: 'owner',
                    },
                },
                { $unwind: '$owner' },
                {
                    $match: {
                        $and: [
                            { slug: req.body.id },
                            {
                                $or: [
                                    { 'lecturers._id': new mongoose.Types.ObjectId(req.user?.id) },
                                    { 'owner._id': new mongoose.Types.ObjectId(req.user?.id) }
                                ]
                            }
                        ]
                    },
                },
                { $limit: 1 }
            ]);

            const classInfo: IClass | null = classArr.length > 0 ? classArr[0] : null;
            
            if (!classInfo) {
                return next(new AppError('No class found with that ID', 404));
            }

            const redisClient = redis.getClient();
            await redisClient?.setEx(this.classCacheKey(req), Number(process.env.REDIS_CACHE_EXPIRES), JSON.stringify(classInfo));
            
            return res.status(200).json({
                status: 'success',
                message: 'Get class successfully',
                data: classInfo
            });
        }
        
        const classArr = await ClassModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'lecturers',
                    foreignField: '_id',
                    as: 'lecturers',
                },
            },
            {   
                $lookup: {
                    from: 'users',
                    localField: 'students',
                    foreignField: '_id',
                    as: 'students',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner',
                },
            },
            { $unwind: '$owner' },
            {
                $match: {
                    $or: [
                        { 'lecturers._id': new mongoose.Types.ObjectId(req.user?.id) },
                        { 'owner._id': new mongoose.Types.ObjectId(req.user?.id) }
                    ]
                },
            },
        ]);

        const classesInfo: IClass[] = classArr;

        const redisClient = redis.getClient();
        await redisClient?.setEx(this.classCacheKey(req), Number(process.env.REDIS_CACHE_EXPIRES), JSON.stringify(classesInfo));

        res.status(200).json({
            status: 'success',
            message: 'Get classes successfully',
            data: classesInfo ?? []
        });
    };

    private createClass = async (req: Request, res: Response, next: NextFunction) => {

        const { name, cid } = req.body as CreateClassDTO;

        const classCreated: IClass = await ClassModel.create({
            name,
            cid,
            owner: req.user!._id
        });

        const classInfo: IClass | null = await ClassModel.findOne({_id: classCreated.id, owner: req.user?.id}).populate('owner').lean();

        const redisClient = redis.getClient();
        await redisClient?.del(this.classCacheKey(req));

        res.json({
            status: 'success',
            message: 'Create class successfully',
            data: classInfo
        })
    };
    
    private ownerProtect = async (req: Request, res: Response, next: NextFunction) => {
        const classInfo: IClass | null = await ClassModel.findOne({ slug: req.body.id, owner: req.user?.id }).lean();
        
        if (!classInfo) {
            return next(new AppError('No class found with that ID', 404));
        }

        req.class = classInfo;

        next();
    };

    private invitedProtect = async (req: Request, res: Response, next: NextFunction) => {

        const classArr = await ClassModel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'lecturers',
                    foreignField: '_id',
                    as: 'lecturers',
                },
            },
            { 
                $project: {
                    slug: 1,
                    owner: 1,
                    lecturers: {
                        _id: 1,
                    },
                }
            },
            {
                $match: {
                    $and: [
                        { slug: req.body.classID },
                        {
                            $or: [
                                { 'lecturers._id': new mongoose.Types.ObjectId(req.user?.id) },
                                { owner: new mongoose.Types.ObjectId(req.user?.id) }
                            ]
                        }
                    ]
                },
            },
            {
                $limit: 1
            }
        ]);
          
        const classInfo: IClass | null = classArr.length > 0 ? classArr[0] : null;
        
        if (!classInfo) {
            return next();
        }
            
        return next(new AppError('You has joined this class', 404));
    };

    private sendInvitedMessage = async (req: Request, res: Response, next: NextFunction) => {
        const inviteInfo = req.body as InviteClassDTO;

        const source = fs.readFileSync(path.join(__dirname, '../../templates/invitationMailer/index.html'), 'utf8').toString();
        const template = handlebars.compile(source);
        
        const inviteCode = await Jwt.createToken({ 
            email: req.user?.email,
            classID: req.class.slug
        }, {
            expiresIn: 10 * 60 * 60 * 1000
        });
        
        const props = {
            sender: req.user?.username,
            classID: req.class.cid,
            className: req.class.name,
            role: inviteInfo.role,
            inviteLink: inviteInfo.inviteLink.replace(/\?code=\w{7}/, `?code=${inviteCode}`)
        };

        const htmlToSend = template(props);

        const emailList = req.body.emails;

        GMailer.sendMail({
            to: emailList,
            subject: 'Class invitation',
            html: htmlToSend
        });

        res.status(200).json({
            status: 'success',
            message: 'Send invited message successfully',
            data: {}
        });
    }

    private joinClass = async (req: Request, res: Response, next: NextFunction) => {
        const joinInfo = req.body as JoinClassDTO;
        const decoded = await Jwt.verifyToken(joinInfo.code);

        if (decoded.classID !== req.body.classID) {
            return next(new AppError('Invalid invitation code', 400));
        }

        const classInfo: any = await ClassModel.findOne({ slug: decoded.classID });
        classInfo?.lecturers.push(req.user?.id);

        const joinedData = await classInfo.save();

        const newClass = await ClassModel.findOne({ slug: joinedData.slug }).populate('lecturers students owner').lean();

        const redisClient = redis.getClient();
        await redisClient?.del(this.classCacheKey(req));

        return res.status(200).json({
            status: 'success',
            message: 'Join class successfully',
            data: newClass
        });
    };
}

export default new ClassController();