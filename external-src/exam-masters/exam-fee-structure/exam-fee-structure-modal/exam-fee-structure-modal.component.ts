import { Location } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ConfimationComponent } from 'app/main/dialogs/confimation/confimation.component';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import *  as moment from 'moment';

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-exam-fee-structure-modal',
    templateUrl: './exam-fee-structure-modal.component.html',
    styleUrls: ['./exam-fee-structure-modal.component.scss']
})

export class ExamFeeStructureModalComponent implements OnInit {

    displayedColumns: string[] = ['id', 'ApplicableFor', 'examType', 'fee', 'includeInReg', 'actions'];
    displayedColumns2: string[] = ['id', 'ApplicableFor', 'fromDate', 'toDate', 'fee', 'actions'];
    displayedColumns1: string[] = ['id', 'fineName', 'fineFromDate', 'regFeeFine', 'supplyFeeFine', 'actions'];
    dataSource: MatTableDataSource < any > ;
    dataSource1: MatTableDataSource < any > ;
    dataSourceRevision:MatTableDataSource < any > ;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    panelOpenState = true;
    public searchText: string;

    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
    private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private isActive = CONSTANTS.isActive;
    private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
    private additionalFeeType = CONSTANTS.additionalFeeType;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private examFeeStructureUrl = CONSTANTS.examFeeStructureUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
    private examFeeType = CONSTANTS.examFeeType;
    public dateFormate = CONSTANTS.dateFormate;
    private sortOrder = CONSTANTS.sortOrder;
    private revisionType = CONSTANTS.revisionType;

    revisionTypes: GeneralDetail[] = [];
    staffForm: FormGroup;
    examForm: FormGroup;
    colleges: College[] = [];
    courses: Course[] = [];
    step = 0;
    examsList: any[] = [];
    exam: any = {};
    courseGroups: any[] = [];
    courseYears: any[] = [];
    courseGroupYears: any[] = [];
    examAdditionalFee: any = {};
    examRevisoinFee:any={}
    addedexamAdditionalFee: any[] = [];
    addedexamRevisionFee:any[]=[]
    additionalFeeTypes: GeneralDetail[] = [];
    examFeeStructure: any[] = [];
    exams: any[] = [];
    pageParams: any = {};
    examFeeStructurelist: any[] = [];
    examLateFees: any = {};
    addedExamLateFees: any[] = [];
    examFeeStructureId;
    deletedFeeFines = [];
    deletedAdditionalFees = [];
    deletedRevisionFees=[]
    flag = false;
    examType;
    examFeeTypes: any[] = [];

    constructor(private formBuilder: FormBuilder, private route: ActivatedRoute, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private _location: Location, private dialog: MatDialog, private genericFunctions: GenericFunctions) {
        this.getData();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);
        this.dataSource1.paginator = this.paginator;
        this.dataSource1.sort = this.sort;

        this.staffForm = this.formBuilder.group({
            //  collegeId: ['', Validators.required],
            // courseId: ['', Validators.required],
            // examId: ['', Validators.required],
            examFeeStructureName: ['', Validators.required],
            collectionEndDate: [this.genericFunctions.moment()],
            collectionStartDate: [this.genericFunctions.moment()],
            
        });

        this.examForm = this.formBuilder.group({
            regFee: [],
            subject1Fee: [],
            subject2Fee: [],
            subject3Fee: [],
            subject4Fee: [],
            subject5Fee: [],
            subject6Fee: [],
            subject7Fee: [],
            supplyFee: [],
        });

        this.route.queryParams
            .subscribe(params => {
                if (!this.isEmptyObject(params)) {
                  if(this.pageParams.check === 2)
                    this.pageParams.collegeName = params.collegeName;
                    this.pageParams.collegeId = params.collegeId;
                    this.pageParams.check = +params.check;
                    this.pageParams.examFeeStructureId = params.examFeeStructureId;
                    this.pageParams.universityId = params.universityId;
                    this.pageParams.examName = params.examName;
                    this.pageParams.courseName = params.courseName;
                    this.pageParams.fromDate = params.fromDate;
                    this.pageParams.toDate = params.toDate;
                    this.pageParams.courseId = params.courseId;
                    this.pageParams.examId = params.examId;
                    this.pageParams.academicYearId = params.academicYearId;
                    this.pageParams.academicYear = params.academicYear;
                   // this.selectedCollege(this.pageParams.collegeId);
                    this.selectedCourse(this.pageParams.courseId);
                    this.getExamFeeStructure(this.pageParams.examFeeStructureId);
                }
        });
console.log(this.pageParams,'this.pageParams');

        this.examLateFees.fineFromDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
        this.examLateFees.fineToDate =  this.examLateFees.fineFromDate;
        this.examRevisoinFee.fromDate = new Date()
        this.examRevisoinFee.toDate = this.examRevisoinFee.fromDate


    }

    // tslint:disable-next-line:typedef
    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }

    getExamFeeStructure(examFeeStructureId): void {
        if (examFeeStructureId != null) {
            this.crudService.listDetailsById(this.examFeeStructureCrudUrl, examFeeStructureId, 'examFeeStructureId')
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examFeeStructurelist = result.data.resultList;
                            if (this.examFeeStructurelist.length > 0) {
                                if (this.examFeeStructurelist[0].examFeeStructureCourseyr.length > 0) {
                                  //  this.staffForm.get('courseId').setValue(this.examFeeStructurelist[0].examFeeStructureCourseyr[0].courseId);
                                    this.selectedCourse(this.examFeeStructurelist[0].examFeeStructureCourseyr[0].courseId);
                                }
                                // this.staffForm.get('examId').setValue(this.examFeeStructurelist[0].examId);
                                this.staffForm.get('examFeeStructureName').setValue(this.examFeeStructurelist[0].examFeeStructureName);
                                this.staffForm.get('collectionEndDate').setValue(this.examFeeStructurelist[0].collectionEndDate);
                                this.staffForm.get('collectionStartDate').setValue(this.examFeeStructurelist[0].collectionStartDate);
                                this.examLateFees.fineFromDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
                                this.examLateFees.fineToDate =  this.examLateFees.fineFromDate;

                                this.examForm.get('regFee').setValue(this.examFeeStructurelist[0].regFee);
                                this.examForm.get('subject1Fee').setValue(this.examFeeStructurelist[0].subject1Fee);
                                this.examForm.get('subject2Fee').setValue(this.examFeeStructurelist[0].subject2Fee);
                                this.examForm.get('subject3Fee').setValue(this.examFeeStructurelist[0].subject3Fee);
                                this.examForm.get('subject4Fee').setValue(this.examFeeStructurelist[0].subject4Fee);
                                this.examForm.get('subject5Fee').setValue(this.examFeeStructurelist[0].subject5Fee);
                                this.examForm.get('subject6Fee').setValue(this.examFeeStructurelist[0].subject6Fee);
                                this.examForm.get('subject7Fee').setValue(this.examFeeStructurelist[0].subject7Fee);
                                this.examForm.get('supplyFee').setValue(this.examFeeStructurelist[0].supplyFee);
                               
                                this.addedexamAdditionalFee = [];
                                this.addedexamRevisionFee=[]
                                if (this.examFeeStructurelist[0].examFeeAdditionalStructure != null) {
                                    // this.addedexamAdditionalFee = this.examFeeStructurelist[0].examFeeAdditionalStructure;
                                    for (let i = 0; i < this.examFeeStructurelist[0].examFeeAdditionalStructure.length; i++) {
                                        if(this.examFeeStructurelist[0].examFeeAdditionalStructure[i].generalMasterId !== 103){
                                            // this.addedexamAdditionalFee[i].type = this.addedexamAdditionalFee[i].adtExamfeetypeCatDisplayName;
                                            this.examFeeStructurelist[0].examFeeAdditionalStructure[i].type=this.examFeeStructurelist[0].examFeeAdditionalStructure[i].adtExamfeetypeCatDisplayName;
                                            this.addedexamAdditionalFee.push(this.examFeeStructurelist[0].examFeeAdditionalStructure[i])

                                        }
                                        else{
                                            this.addedexamRevisionFee.push(this.examFeeStructurelist[0].examFeeAdditionalStructure[i])
                                        }
                                    }
                                }
                              
                                this.addedExamLateFees = this.examFeeStructurelist[0].examFeeFine;
                                this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
                                this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);
                                this.dataSourceRevision = new MatTableDataSource(this.addedexamRevisionFee);

                            }
                        } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }

                }, error => {
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }

    getData(): void {
        this.flag = false;
        /*----------- STUDENT TYPES -----------*/
        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.additionalFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.additionalFeeTypes = result.data.resultList;
                        if (this.additionalFeeTypes.filter(x => (x.generalDetailCode === 'Regular')).length > 0) {
                            this.examAdditionalFee.adtExamfeetypeCatId = this.additionalFeeTypes.filter(x => (x.generalDetailCode === 'Regular'))[0].generalDetailId;
                            this.examAdditionalFee.includeInReg =false;

                        }
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });

             /*----------- STUDENT TYPES -----------*/
        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200){
                            if (result.data.resultList && result.data.resultList !== '') {
                                this.examFeeTypes = [];
                                // tslint:disable-next-line: prefer-for-of
                                for (let i = 0; i < result.data.resultList.length; i++){
                                     if (result.data.resultList[i].generalDetailCode === 'Regular' || result.data.resultList[i].generalDetailCode === 'Supple'){
                                        this.examFeeTypes.push(result.data.resultList[i]);
                                     }
                                }
                            } else {
                                this.snotifyService.success(result.message, 'Success!');
                            }
                        }else {
                            this.snotifyService.error(result.message, 'Error!');
                        }
                }, error => {
                    if (error.error.statusCode === 401){
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    }else{
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
            this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.revisionType, 'true', this.generalDetailsByCodeUrl, this.isActive)
   .subscribe(result => {
       if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.revisionTypes = result.data.resultList;
                      this.examRevisoinFee.adtExamfeetypeCatId = this.revisionTypes[0].generalDetailId

                   } else {
                       this.snotifyService.success(result.message, 'Success!');
                   }
               }else {
                   this.snotifyService.error(result.message, 'Error!');
               }
       }, error => {
       if (error.error.statusCode === 401){
           this.snotifyService.error(error.error.message, 'Error!');
           this.genericFunctions.logOut(this.router.url);
       }else{
           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
       }
   });
    }

    // tslint:disable-next-line:typedef
    // selectedCollege(collegeId) {
    //     this.flag = false;
    //     this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
    //     this.staffForm.get('courseId').setValue('');
    //     this.examsList = [];
    //     this.courses = [];
    //     if (collegeId !== null && collegeId !== '') {
    //         /*----------- COURSES -----------*/
    //         this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
    //             .subscribe(result => {
    //                 if (result.statusCode === 200) {
    //                     if (result.data.resultList && result.data.resultList !== '') {
    //                         this.courses = result.data.resultList;
    //                     } else {
    //                         this.snotifyService.success(result.message, 'Success!');
    //                     }
    //                 } else {
    //                     this.snotifyService.error(result.message, 'Error!');
    //                 }

    //             }, error => {
    //                 if (error.error.statusCode === 401) {
    //                     this.snotifyService.error(error.error.message, 'Error!');
    //                     this.genericFunctions.logOut(this.router.url);
    //                 } else {
    //                     this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //                 }
    //             });
    //     }
    // }

    selectedCourse(courseId): void {
        this.flag = false;
        this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
        this.examsList = [];
        if (courseId !== null && courseId !== undefined) {
            /*-----------Exams -----------*/
            this.spinner.show();
            this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
                .subscribe(result => {
                    this.getExams(courseId);
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courseGroups = result.data.resultList;
                            if (this.courseGroups.length > 0) {
                                this.getCourseYears(courseId);
                            }
                        } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });

        }
    }

    getExams(courseId): void {
        if (courseId != null) {
            this.flag = false;
            this.crudService.listDetailsByTwoIds(this.examMasterUrl, courseId, 'true',
            this.getDetailsByCourseIdUrl, this.isActive)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.exams = result.data.resultList;
                            // for (let i = 0; i < this.exams.length; i++) {
                            //     if (this.exams[i].isInternalExam === true) {
                            //         this.exams.splice(i, 1);
                            //         i--;
                            //     }
                            // }
                        } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }

    // tslint:disable-next-line: typedef
    selectedExam(examId){
        if (examId !== null && examId !== undefined){
            this.flag = true;
            // tslint:disable-next-line: no-conditional-assignment
            if (this.examType = this.exams.filter(x => ( x.examId === +examId))[0].isRegularExam === true){
               return this.examType = 'R';
              }else
              // tslint:disable-next-line: no-conditional-assignment
              if (this.examType = this.exams.filter(x => ( x.examId === +examId))[0].isInternalExam === true){
                return this.examType = 'I';
              }else
              // tslint:disable-next-line: no-conditional-assignment
              if (this.examType = this.exams.filter(x => ( x.examId === +examId))[0].isSupplyExam === true){
                return this.examType = 'S';
              }  
            
        }

    }
    getCourseYears(courseId): void {
       
        if (courseId != null) {
            this.courseGroupYears = [];
            this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
            this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
             this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
                .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courseYears = result.data.resultList;
                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.courseGroups.length; i++) {
                                // tslint:disable-next-line: prefer-for-of
                                for (let j = 0; j < this.courseYears.length; j++) {
                                    if (this.examFeeStructurelist.length > 0) {
                                        if (this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId &&
                                                x.courseYearId === this.courseYears[j].courseYearId)).length > 0) {
                                                    // tslint:disable-next-line: max-line-length
                                                    if (this.courseGroupYears.filter(y => (y.courseGroupId === this.courseGroups[i].courseGroupId && y.courseYearId === this.courseYears[j].courseYearId)).length === 0){
                                                        this.courseGroupYears.push({
                                                            courseGroupId: this.courseGroups[i].courseGroupId,
                                                            groupCode: this.courseGroups[i].groupCode,
                                                            courseYearName: this.courseYears[j].courseYearName,
                                                            courseYearId: this.courseYears[j].courseYearId,
                                                            courseYearCode: this.courseYears[j].courseYearCode,
                                                            check: true,
                                                            // tslint:disable-next-line:max-line-length
                                                            examFeeStructureId: this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId &&
                                                                x.courseYearId === this.courseYears[j].courseYearId))[0].examFeeStructureId,
                                                            // tslint:disable-next-line:max-line-length
                                                            examFeeCourseyrId: this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId &&
                                                                x.courseYearId === this.courseYears[j].courseYearId))[0].examFeeCourseyrId,
                                                            isActive: true
                                                        });
                                                    }
                                        } else {
                                            // tslint:disable-next-line: max-line-length
                                            if (this.courseGroupYears.filter(y => (y.courseGroupId === this.courseGroups[i].courseGroupId && y.courseYearId === this.courseYears[j].courseYearId)).length === 0){
                                                this.courseGroupYears.push({
                                                    courseGroupId: this.courseGroups[i].courseGroupId,
                                                    groupCode: this.courseGroups[i].groupCode,
                                                    courseYearName: this.courseYears[j].courseYearName,
                                                    courseYearId: this.courseYears[j].courseYearId,
                                                    courseYearCode: this.courseYears[j].courseYearCode,
                                                    check: false
                                                });
                                            }
                                        }
                                    } else {
                                        // tslint:disable-next-line: max-line-length
                                        if (this.courseGroupYears.filter(y => (y.courseGroupId === this.courseGroups[i].courseGroupId && y.courseYearId === this.courseYears[j].courseYearId)).length === 0){
                                            this.courseGroupYears.push({
                                                courseGroupId: this.courseGroups[i].courseGroupId,
                                                groupCode: this.courseGroups[i].groupCode,
                                                courseYearName: this.courseYears[j].courseYearName,
                                                courseYearId: this.courseYears[j].courseYearId,
                                                courseYearCode: this.courseYears[j].courseYearCode,
                                                check: false
                                            });
                                        }
                                    }

                                }
                            }
                        } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }
                }, error => {
                    this.spinner.hide();
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
    }

    addAdditionalFees(): void {
        if (this.examAdditionalFee.adtExamfeetypeCatId !== null && this.examAdditionalFee.adtExamfeetypeCatId !== undefined &&
            this.examAdditionalFee.fee !== undefined) {
            this.examAdditionalFee.collegeId = +this.pageParams.collegeId;
            this.examAdditionalFee.type = this.additionalFeeTypes.filter(x => x.generalDetailId === this.examAdditionalFee.adtExamfeetypeCatId)[0].generalDetailCode;
            this.examAdditionalFee.isActive = true;
            this.examAdditionalFee.includeInRev = false;
            this.examAdditionalFee.includeInReg = this.examAdditionalFee.includeInReg? this.examAdditionalFee.includeInReg:false;
            this.examAdditionalFee.examTypeCatDisplayCode = this.examFeeTypes.filter(x => x.generalDetailId === this.examAdditionalFee.examTypeCatId)[0].generalDetailCode;
            this.addedexamAdditionalFee.push(this.examAdditionalFee);
            this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
            this.examAdditionalFee = {};
        }
    }
    addReEvaluationFees(){
        if (this.examRevisoinFee.adtExamfeetypeCatId !== null && this.examRevisoinFee.adtExamfeetypeCatId !== undefined &&
            this.examRevisoinFee.fee !== undefined) {
            this.examRevisoinFee.collegeId = +this.pageParams.collegeId;
            this.examRevisoinFee.includeInRev = true;
            this.examRevisoinFee.includeInReg = false;
            this.examRevisoinFee.fromDate = this.examRevisoinFee.fromDate;
            this.examRevisoinFee.toDate = this.examRevisoinFee.toDate;
            // this.examAdditionalFee.type = this.additionalFeeTypes.filter(x => x.generalDetailId === this.examAdditionalFee.adtExamfeetypeCatId)[0].generalDetailCode;
            this.examRevisoinFee.isActive = true;
            this.examRevisoinFee.adtExamfeetypeCatCode = this.revisionTypes.filter(x => x.generalDetailId === this.examRevisoinFee.adtExamfeetypeCatId)[0].generalDetailDisplayName;
            this.addedexamRevisionFee.push(this.examRevisoinFee);
            this.dataSourceRevision = new MatTableDataSource(this.addedexamRevisionFee);
            this.examRevisoinFee = {};
        }
    }
    addExamLateFees(): void {
        if (this.examLateFees.fineName !== null && this.examLateFees.fineName !== undefined){
        this.examLateFees.isActive = true;
        this.examLateFees.collegeId = +this.pageParams.collegeId;
        this.examLateFees.examId = +this.pageParams.examId;
        this.addedExamLateFees.push(this.examLateFees);
        this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);
        this.examLateFees = {};
        this.examLateFees.regFeeFine = 0;
        this.examLateFees.supplyFeeFine = 0;
        this.examLateFees.fineFromDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
        this.examLateFees.fineToDate = this.examLateFees.fineFromDate;
    }
    }

    deleteFeeFine(item, index): void {
        const dialogRef = this.dialog.open(ConfimationComponent, {
            width: '350px',
            
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details === 'delete') {
                if (index > -1) {
                    this.addedExamLateFees.splice(index, 1);
                    item.isActive = false;
                    this.deletedFeeFines.push(item);
                }
               
                this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);
            }
        });
    }

    deleteFee(item, index): void {
        const dialogRef = this.dialog.open(ConfimationComponent, {
            width: '350px',
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details === 'delete') {
                if (index > -1) {
                    this.addedexamAdditionalFee.splice(index, 1);
                    item.isActive = false;
                    this.deletedAdditionalFees.push(item);
                }
                this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
            }
        });
    }
    deleteRevision(item, index): void {
        const dialogRef = this.dialog.open(ConfimationComponent, {
            width: '350px',
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details === 'delete') {
                if (index > -1) {
                    this.addedexamRevisionFee.splice(index, 1);
                    item.isActive = false;
                    this.deletedRevisionFees.push(item);
                }
                this.dataSourceRevision = new MatTableDataSource(this.addedexamRevisionFee);
            }
        });
    }

    goBack(): void {
            this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup'], {
                queryParams: {
                    universityId: this.pageParams.universityId,
                    collegeId: this.pageParams.collegeId,
                    examId: this.pageParams.examId,
                    academicYearId : this.pageParams.academicYearId,
                    courseId : this.pageParams.courseId,
                    check: this.pageParams.check,
                }
            });
    }

    addExamFeestructure(): void{
        
        if ( this.selectedExam(this.pageParams.examId) === 'R'){
            if (this.examForm.value.regFee !== null && this.examForm.value.regFee !== undefined){
                this.addExamFeestructurePost();
            }else{
                this.snotifyService.info('Please enter the regular fee amount', 'info');
            }
        }else
        if ( this.selectedExam(this.pageParams.examId) === 'I'){
            if (this.examForm.value.subject1Fee !== null && this.examForm.value.subject1Fee !== undefined){
                this.addExamFeestructurePost();
            }else{
                this.snotifyService.info('Please enter the Internal fee amount', 'info');
            } 
        }else
        if ( this.selectedExam(this.pageParams.examId) === 'S'){
            if (this.examForm.value.subject1Fee !== null && this.examForm.value.subject1Fee !== undefined){
                this.addExamFeestructurePost();
            }else{
                this.snotifyService.info('Please enter the supplementary fee amount', 'info');
            }
        }

    }

    addExamFeestructurePost(): void {
        if (this.staffForm.valid && this.examForm.valid) {
            this.examFeeStructure = [];
            this.spinner.show();
            if (this.examFeeStructurelist.length > 0) {
                this.examFeeStructureId = this.examFeeStructurelist[0].examFeeStructureId;
            } else {
                this.examFeeStructureId = null;
            }
            this.examFeeStructure.push({
                collegeId: +this.pageParams.collegeId,
                examId: +this.pageParams.examId,
                isActive: true,
                collectionEndDate: this.genericFunctions.momentWithDateFormatYMD(this.staffForm.value.collectionEndDate),
                collectionStartDate: this.genericFunctions.momentWithDateFormatYMD(this.staffForm.value.collectionStartDate),
                examFeeStructureName: this.staffForm.value.examFeeStructureName,
                regFee: this.examForm.value.regFee,
                subject1Fee: this.examForm.value.subject1Fee,
                subject2Fee: this.examForm.value.subject2Fee,
                subject3Fee: this.examForm.value.subject3Fee,
                subject4Fee: this.examForm.value.subject4Fee,
                subject5Fee: this.examForm.value.subject5Fee,
                subject6Fee: this.examForm.value.subject6Fee,
                subject7Fee: this.examForm.value.subject7Fee,
                supplyFee: this.examForm.value.supplyFee,
                examFeeStructureId: this.examFeeStructureId,
            });
            this.examFeeStructure[0].examFeeStructureCourseyr = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.courseGroupYears.length; i++) {
                if (this.courseGroupYears[i].examFeeCourseyrId) {
                    if (this.courseGroupYears[i].check) {
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: +this.pageParams.collegeId,
                            isActive: true,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                            examFeeCourseyrId: this.courseGroupYears[i].examFeeCourseyrId,
                        });
                    } else {
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: +this.pageParams.collegeId,
                            isActive: false,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                            examFeeCourseyrId: this.courseGroupYears[i].examFeeCourseyrId,
                        });
                    }
                } else {
                    if (this.courseGroupYears[i].check) {
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: +this.pageParams.collegeId,
                            isActive: true,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                        });
                    }
                }
            }
            this.examFeeStructure[0].examFeeFine = this.addedExamLateFees;
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.deletedFeeFines.length; i++) {
                this.examFeeStructure[0].examFeeFine.push(this.deletedFeeFines[i]);
            }
            // this.examFeeStructure[0].examFeeAdditionalStructure = this.addedexamAdditionalFee;
            this.examFeeStructure[0].examFeeAdditionalStructure = [
                ...this.addedexamAdditionalFee, // Additional fees
                ...this.addedexamRevisionFee, 
            ]

            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.deletedAdditionalFees.length; i++) {
                this.examFeeStructure[0].examFeeAdditionalStructure.push(this.deletedAdditionalFees[i]);
            }
            for (let i = 0; i < this.deletedRevisionFees.length; i++) {
                this.examFeeStructure[0].examFeeAdditionalStructure.push(this.deletedRevisionFees[i]);
            }
            
            if (this.examFeeStructure[0].examFeeStructureCourseyr.length > 0){
                console.log(this.examFeeStructure);
                  /*---------- ADD EXAM FEE STRUCTURE ----------*/
            this.crudService.add(this.examFeeStructureUrl, this.examFeeStructure)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                        this.goBack();
                        // this.getExamFeeStructure(this.pageParams.examFeeStructureId);
                        // // this.selectedCourse(this.staffForm.value.courseId);
                        // this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup'], {
                        //     queryParams: {
                        //         collegeId: this.pageParams.collegeId,
                        //         examId: this.pageParams.examId,
                        //         academicYearId : this.pageParams.academicYearId,
                        //         courseId : this.pageParams.courseId,
                        //     }
                        // });
                    }
                } else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
            }
            else{
                this.spinner.hide();
                this.snotifyService.info(CONSTANTS.message.selectCurYer, 'Info!'); 
            }
        }
    }

    /*================= DATE VALIDATION ================*/ 
calDay(): void{
    const date1 = new Date(moment(this.staffForm.value.collectionStartDate).format()); // new Date(this.data.issueTodate);
    const date2 = new Date(moment(this.staffForm.value.collectionEndDate).format()); // new Date(returnDate);
    if (date1.getTime() > date2.getTime()){
      this.snotifyService.info('From date should be less then To date.', 'Info!');
      this.staffForm.get('collectionEndDate').setValue(this.staffForm.value.collectionStartDate);
    //  this.examLateFees.fineFromDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
    //  this.examLateFees.fineToDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
    }
    this.examLateFees.fineFromDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
    this.examLateFees.fineToDate = this.genericFunctions.momentAfterDayWithDate(this.staffForm.value.collectionEndDate);
}

    /*================= DATE VALIDATION ================*/ 
    calDay2(): void{
        const date1 = new Date(moment(this.examLateFees.fineFromDate).format()); // new Date(this.data.issueTodate);
        const date2 = new Date(moment(this.examLateFees.fineToDate).format()); // new Date(returnDate);
        if (date1.getTime() > date2.getTime()){
          this.snotifyService.info('From date should be less then To date.', 'Info!');
          // this.staffForm.get('fineToDate').setValue(this.examLateFees.fineFromDate);
          this.examLateFees.fineToDate = date1;
        }
    }
    calDay3(): void{
        const date1 = new Date(moment(this.examRevisoinFee.fromDate).format()); // new Date(this.data.issueTodate);
        const date2 = new Date(moment(this.examRevisoinFee.toDate).format()); // new Date(returnDate);
        this.examRevisoinFee.toDate = new Date(this.examRevisoinFee.fromDate);
        this.examRevisoinFee.toDate.setDate(this.examRevisoinFee.toDate);
        if (date1.getTime() > date2.getTime()){
          this.snotifyService.info('From date should be less then To date.', 'Info!');
          // this.staffForm.get('fineToDate').setValue(this.examLateFees.fineFromDate);
        //   this.examRevisoinFee.toDate = date1;
        }
    }
}