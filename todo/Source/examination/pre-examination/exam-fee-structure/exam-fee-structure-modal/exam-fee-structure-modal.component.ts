import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import {Location} from '@angular/common';
import { ConfimationComponent } from 'app/main/dialogs/confimation/confimation.component';

@Component({
  selector: 'app-exam-fee-structure-modal',
  templateUrl: './exam-fee-structure-modal.component.html',
  styleUrls: ['./exam-fee-structure-modal.component.scss']
})

export class ExamFeeStructureModalComponent implements OnInit {

    displayedColumns: string[] = ['id', 'ApplicableFor', 'fee', 'actions'];
    displayedColumns1: string[] = ['id', 'fineName', 'fineFromDate', 'regFeeFine', 'supplyFeeFine', 'actions'];
    dataSource: MatTableDataSource<any>;
    dataSource1: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    panelOpenState = true;
    public searchText: string;

    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private isActive = CONSTANTS.isActive;
    private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
    private examFeeType = CONSTANTS.examFeeType;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private examFeeStructureUrl = CONSTANTS.examFeeStructureUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
    private sortOrder = CONSTANTS.sortOrder;

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
    addedexamAdditionalFee: any[] = [];
    examFeeTypes: GeneralDetail[] = [];
    examFeeStructure: any[] = [];
    exams: any[] = [];
    pageParams: any = {};
    examFeeStructurelist: any[] = [];
    examLateFees: any = {};
    addedExamLateFees: any[] = [];
    examFeeStructureId;
    deletedFeeFines = [];
    deletedAdditionalFees = [];

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
            courseId: ['', Validators.required], 
            examId: ['', Validators.required], 
            examFeeStructureName: ['', Validators.required], 
            collectionEndDate: [this.genericFunctions.moment()],
            collectionStartDate: [this.genericFunctions.moment()],
        });

        this.examForm = this.formBuilder.group({
            regFee: ['', Validators.required],
            subject1Fee: [],
            subject2Fee: [],
            subject3Fee: [],
            subject4Fee: [], 
            subject5Fee: [], 
            subject6Fee: [], 
            subject7Fee: [],  
        });

        this.route.queryParams
        .subscribe(params => {
            if (!this.isEmptyObject(params)){
                this.pageParams.examFeeStructureId = params.examFeeStructureId;
                this.pageParams.collegeId = params.collegeId;
                this.selectedCollege(this.pageParams.collegeId);
                this.getExamFeeStructure(this.pageParams.examFeeStructureId);
            }
        });

        this.examLateFees.fineFromDate = this.genericFunctions.moment();
        this.examLateFees.fineToDate = this.genericFunctions.moment();
    }

    // tslint:disable-next-line:typedef
    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }

    getExamFeeStructure(examFeeStructureId): void{
       if (examFeeStructureId != null){
            this.crudService.listDetailsById(this.examFeeStructureCrudUrl, examFeeStructureId, 'examFeeStructureId')
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examFeeStructurelist = result.data.resultList; 
                            if (this.examFeeStructurelist.length > 0){
                                if (this.examFeeStructurelist[0].examFeeStructureCourseyr.length > 0){
                                    this.staffForm.get('courseId').setValue(this.examFeeStructurelist[0].examFeeStructureCourseyr[0].courseId);
                                    this.selectedCourse(this.examFeeStructurelist[0].examFeeStructureCourseyr[0].courseId);
                                }
                                this.staffForm.get('examId').setValue(this.examFeeStructurelist[0].examId);
                                this.staffForm.get('examFeeStructureName').setValue(this.examFeeStructurelist[0].examFeeStructureName);
                                this.staffForm.get('collectionEndDate').setValue(this.examFeeStructurelist[0].collectionEndDate);
                                this.staffForm.get('collectionStartDate').setValue(this.examFeeStructurelist[0].collectionStartDate);

                                this.examForm.get('regFee').setValue(this.examFeeStructurelist[0].regFee);
                                this.examForm.get('subject1Fee').setValue(this.examFeeStructurelist[0].subject1Fee);
                                this.examForm.get('subject2Fee').setValue(this.examFeeStructurelist[0].subject2Fee);
                                this.examForm.get('subject3Fee').setValue(this.examFeeStructurelist[0].subject3Fee);
                                this.examForm.get('subject4Fee').setValue(this.examFeeStructurelist[0].subject4Fee);
                                this.examForm.get('subject5Fee').setValue(this.examFeeStructurelist[0].subject5Fee);
                                this.examForm.get('subject6Fee').setValue(this.examFeeStructurelist[0].subject6Fee);
                                this.examForm.get('subject7Fee').setValue(this.examFeeStructurelist[0].subject7Fee);

                                this.addedexamAdditionalFee = this.examFeeStructurelist[0].examFeeAdditionalStructure;
                                // tslint:disable-next-line: prefer-for-of
                                for (let i = 0; i < this.addedexamAdditionalFee.length; i++){
                                    this.addedexamAdditionalFee[i].type = this.addedexamAdditionalFee[i].adtExamfeetypeCatCode;
                                }
                                this.addedExamLateFees = this.examFeeStructurelist[0].examFeeFine;
                                this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);  
                                this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);  
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
       }
    }

    getData(): void{
        /*----------- STUDENT TYPES -----------*/
        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.examFeeType, 'true', this.generalDetailsByCodeUrl, this.isActive)
        .subscribe(result => {
            if (result.statusCode === 200){
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examFeeTypes = result.data.resultList;
                            if (this.examFeeTypes.filter(x => (x.generalDetailCode === 'Regular')).length > 0){
                                this.examAdditionalFee.adtExamfeetypeCatId = this.examFeeTypes.filter(x => (x.generalDetailCode === 'Regular'))[0].generalDetailId;
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
    }

    // tslint:disable-next-line:typedef
    selectedCollege(collegeId){
    this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);  
    this.staffForm.get('courseId').setValue('');
    this.examsList = [];
    this.courses = [];
    if (collegeId !== null && collegeId !== ''){
            /*----------- COURSES -----------*/
            this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200){
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.courses = result.data.resultList;                
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
    }

    selectedCourse(courseId): void{
    this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);  
    this.examsList = [];
    if (courseId !== null && courseId !== undefined && this.staffForm.value.courseId !== null && this.staffForm.value.courseId !== undefined){
        /*-----------Exams -----------*/      
        this.spinner.show();          
        this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
        .subscribe(result => {
            this.getExams(courseId);
            if (result.statusCode === 200) {
                if (result.data.resultList && result.data.resultList !== '') {
                    this.courseGroups = result.data.resultList;
                    if (this.courseGroups.length > 0){
                        this.getCourseYears(courseId);
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

        }
    }

    getExams(courseId): void{
        if (courseId != null){
            // tslint:disable-next-line:max-line-length
            this.crudService.listDetailsByThreeIds(this.examMasterUrl, this.pageParams.collegeId, courseId, 'true', 'College.collegeId', this.getDetailsByCourseIdUrl, this.isActive)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.exams = result.data.resultList;
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                }else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
        }
    }

    getCourseYears(courseId): void{
    if (courseId != null){
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
                    for (let i = 0; i < this.courseGroups.length; i++){
                        // tslint:disable-next-line: prefer-for-of
                        for (let j = 0; j < this.courseYears.length; j++){
                            if (this.examFeeStructurelist.length > 0){
                                  if (this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId
                                    && x.courseYearId === this.courseYears[j].courseYearId)).length > 0){
                                        this.courseGroupYears.push({
                                            courseGroupId: this.courseGroups[i].courseGroupId,
                                            groupCode: this.courseGroups[i].groupCode,
                                            courseYearName: this.courseYears[j].courseYearName,
                                            courseYearId: this.courseYears[j].courseYearId,
                                            courseYearCode: this.courseYears[j].courseYearCode,
                                            check: true,
                                            // tslint:disable-next-line:max-line-length
                                            examFeeStructureId: this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId
                                                && x.courseYearId === this.courseYears[j].courseYearId))[0].examFeeStructureId,
                                            // tslint:disable-next-line:max-line-length
                                            examFeeCourseyrId: this.examFeeStructurelist[0].examFeeStructureCourseyr.filter(x => (x.courseGroupId === this.courseGroups[i].courseGroupId
                                                && x.courseYearId === this.courseYears[j].courseYearId))[0].examFeeCourseyrId,
                                            isActive: true    
                                        });
                                  }else{
                                    this.courseGroupYears.push({
                                        courseGroupId: this.courseGroups[i].courseGroupId,
                                        groupCode: this.courseGroups[i].groupCode,
                                        courseYearName: this.courseYears[j].courseYearName,
                                        courseYearId: this.courseYears[j].courseYearId,
                                        courseYearCode: this.courseYears[j].courseYearCode,
                                        check: false
                                    });
                                  }
                            }else{
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
                } else {
                    this.snotifyService.success(result.message, 'Success!');
                }
            }else {
                this.snotifyService.error(result.message, 'Error!');
            }
        }, error => {
            this.spinner.hide();
            if (error.error.statusCode === 401){
                this.snotifyService.error(error.error.message, 'Error!');
                this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
        });
    }
    }

    addAdditionalFees(): void{
        if (this.examAdditionalFee.adtExamfeetypeCatId !== null && this.examAdditionalFee.adtExamfeetypeCatId !== undefined &&
            this.examAdditionalFee.fee !== undefined ){
            this.examAdditionalFee.type = this.examFeeTypes.filter(x => x.generalDetailId === this.examAdditionalFee.adtExamfeetypeCatId)[0].generalDetailCode;
            this.examAdditionalFee.isActive = true;
            this.examAdditionalFee.collegeId = this.pageParams.collegeId;
            this.addedexamAdditionalFee.push(this.examAdditionalFee);
            this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee); 
            this.examAdditionalFee = {}; 
        }
    }                                                                        

    addExamLateFees(item): void{
        item.isActive = true;
        item.collegeId = this.pageParams.collegeId;
        this.addedExamLateFees.push(item);
        this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);  
        // this.examLateFees.fineName = '';
        // this.examLateFees.regFeeFine = 0;
        // this.examLateFees.supplyFeeFine = 0;
        // this.examLateFees.fineFromDate = this.genericFunctions.moment();
        // this.examLateFees.fineToDate = this.genericFunctions.moment();
    }

    deleteFeeFine(item, index): void{
        const dialogRef = this.dialog.open(ConfimationComponent, {
            width: '350px',
            });
    
        dialogRef.afterClosed().subscribe(details => {
          if (details === 'delete'){
            if ( index > - 1) { 
                this.addedExamLateFees.splice(index, 1);
                item.isActive = false;
                this.deletedFeeFines.push(item);
            }
            this.dataSource1 = new MatTableDataSource(this.addedExamLateFees);
          }  
        });
    }

    deleteFee(item, index): void{
        const dialogRef = this.dialog.open(ConfimationComponent, {
            width: '350px',
            });
    
        dialogRef.afterClosed().subscribe(details => {
          if (details === 'delete'){
            if ( index > - 1) { 
                this.addedexamAdditionalFee.splice(index, 1);
                item.isActive = false;
                this.deletedAdditionalFees.push(item);
            }
            this.dataSource = new MatTableDataSource(this.addedexamAdditionalFee);
          }  
        });
    }

    goBack(): void{
        this.router.navigate(['admin-examination-management/pre-examination/exam-fee-structure'], 
        { queryParams: { collegeId: this.pageParams.collegeId } });
    }

    addExamFeestructure(): void{
        if (this.staffForm.valid && this.examForm.valid){
            this.spinner.show();
            if (this.examFeeStructurelist.length > 0){
                this.examFeeStructureId = this.examFeeStructurelist[0].examFeeStructureId;
            }else{
                this.examFeeStructureId = null;
            }
            this.examFeeStructure.push({
                collegeId: this.pageParams.collegeId,
                examId: this.staffForm.value.examId,
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
                examFeeStructureId: this.examFeeStructureId,
            });
            this.examFeeStructure[0].examFeeStructureCourseyr = [];
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.courseGroupYears.length; i++){
               if (this.courseGroupYears[i].examFeeCourseyrId){
                    if (this.courseGroupYears[i].check){
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: this.pageParams.collegeId,
                            isActive: true,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                            examFeeCourseyrId: this.courseGroupYears[i].examFeeCourseyrId,
                        });
                    }else{
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: this.pageParams.collegeId,
                            isActive: false,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                            examFeeCourseyrId: this.courseGroupYears[i].examFeeCourseyrId,
                        });
                    }
               }else{
                    if (this.courseGroupYears[i].check){
                        this.examFeeStructure[0].examFeeStructureCourseyr.push({
                            collegeId: this.pageParams.collegeId,
                            isActive: true,
                            courseGroupId: this.courseGroupYears[i].courseGroupId,
                            courseYearId: this.courseGroupYears[i].courseYearId,
                        });
                    }
               }
            }
            this.examFeeStructure[0].examFeeFine = this.addedExamLateFees;
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.deletedFeeFines.length; i++){
                this.examFeeStructure[0].examFeeFine.push(this.deletedFeeFines[i]);
            }
            this.examFeeStructure[0].examFeeAdditionalStructure = this.addedexamAdditionalFee;
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.deletedAdditionalFees.length; i++){
                this.examFeeStructure[0].examFeeAdditionalStructure.push(this.deletedAdditionalFees[i]);
            }
             /*---------- ADD EXAM FEE STRUCTURE ----------*/
            this.crudService.add(this.examFeeStructureUrl, this.examFeeStructure)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200){
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                        // this.selectedCourse(this.staffForm.value.courseId);
                        this.router.navigate(['admin-examination-management/pre-examination/exam-fee-structure'], 
                                            { queryParams: { collegeId: this.pageParams.collegeId } });
                    }
                }else {
                    this.snotifyService.error(result.message, 'Error!');
                }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
        }
    }

}
