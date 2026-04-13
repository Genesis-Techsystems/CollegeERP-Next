import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MarksSetup } from 'app/main/models/marksSetup';
import { Regulations } from 'app/main/models/Rregulations';

@Component({
    selector: 'app-marks-setup',
    templateUrl: './marks-setup.component.html',
    styleUrls: ['./marks-setup.component.scss']
})

export class MarksSetupComponent implements OnInit {

    displayedColumns: string[] = ['id', 'marksSetupName', 'internalMarks', 'externalMarks', 'passPercentage', 'externalPassPercentage','finalIntPercentage','finalExtPercentage', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;

    private universitiesUrl = CONSTANTS.universitiesUrl;
    private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private examMarksSetupUrl = CONSTANTS.examMarksSetupUrl;
    private exammarkssetupUrl = CONSTANTS.exammarkssetupUrl;
    private markssetupIdUrl = CONSTANTS.markssetupIdUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
    private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
    private isActive = CONSTANTS.isActive;
    private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
    private subjectType = CONSTANTS.subjectType;
    private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
    private collegeWiseDetails=CONSTANTS.collegeWiseDetailsUrl;
    private subjectCategory = CONSTANTS.subjectCategory;

    marksSetupForm: FormGroup;
    colleges: College[] = [];
    courses: Course[] = [];
    regulations: Regulations[] = [];
    step = 0;
    examsMarksSteupList: MarksSetup[] = [];
    subjectTypes: any[] = [];
    examsMarks: any = {};
    examMarksList: any[] = [];
    newArraryList: any[] = [];
    universities = [];
    filtersDetailsList =[]
    filtersdata=[]
    regulationData=[]
    courseData=[];
    regData =[]

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions) {
        // this.getData();
        this.getfilterDetails();
                    // this.getUniversity();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.marksSetupForm = this.formBuilder.group({
            universityId: ['', Validators.required],
            // collegeId: ['', Validators.required],
            academicYearId: ['', Validators.required],
            courseId: ['', Validators.required],
            regulationId: ['', Validators.required],
            isForDisabled: [false]
        });
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
 /*---------- GET UNVERSITIES ----------*/
 getUniversity(): void {
    this.crudService.listDetailsById(this.universitiesUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.universities = result.data.resultList;
            if (this.universities.length > 0) {
                this.marksSetupForm.get('universityId').setValue(this.universities[0].universityId);
                this.selectedUniversity(this.marksSetupForm.value.universityId);
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
    // getData(): void {
    //     /*----------- COLLEGES -----------*/
    //     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
    //         .subscribe(result => {
    //             if (result.statusCode === 200) {
    //                 if (result.data.resultList && result.data.resultList !== '') {
    //                     this.colleges = result.data.resultList;
    //                     if (this.colleges.length > 0) {
    //                         this.marksSetupForm.get('collegeId').setValue(this.colleges[0].collegeId);
    //                         this.selectedCollege(this.marksSetupForm.value.collegeId);
    //                     }
    //                 } else {
    //                     this.snotifyService.success(result.message, 'Success!');
    //                 }
    //             } else {
    //                 this.snotifyService.error(result.message, 'Error!');
    //             }

    //         }, error => {
    //             if (error.error.statusCode === 401) {
    //                 this.snotifyService.error(error.error.message, 'Error!');
    //                 this.genericFunctions.logOut(this.router.url);
    //             } else {
    //                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //             }
    //     });
    // }
    getfilterDetails(){
        this.spinner.show()
        let request = [
          {paramName: 'in_flag', paramValue: 'clg_filters'},
          {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
          {paramName: 'in_college_id', paramValue: 0},
          {paramName: 'in_course_id', paramValue: 0},
          {paramName: 'in_course_group_id', paramValue: 0},
          {paramName: 'in_course_year_id', paramValue: 0},
          {paramName: 'in_group_section_id', paramValue: 0},
          {paramName: 'in_academic_year_id', paramValue: 0},
          {paramName: 'in_dept_id', paramValue: 0},
          {paramName: 'in_isadmin', paramValue: 0},
          {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
          {paramName: 'in_loginuser_roleid', paramValue: 0},
          {paramName: 'in_subject', paramValue: ''},
          {paramName: 'in_employee', paramValue: ''},
          {paramName: 'in_gm_codes', paramValue: ''},
        ];
        this.crudService.getDetailsByRequest(this.collegeWiseDetails, '', request, '&')
      .subscribe(result =>  {
          if (result.statusCode === 200) {
            this.spinner.hide()
            if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
            for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_filters'){
                    this.filtersdata = this.filtersDetailsList[i];
                    }
                    else if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].clg_filters_regulation === 'clg_filters_regulation'){
                        this.regulationData = this.filtersDetailsList[i];
                        }
               
            }  
            /*----------- DISTINCT COLLEGE-----------*/            
            const universityList = this.filtersdata.map(({ fk_university_id }) => fk_university_id);
            this.universities = this.filtersdata.filter(({ fk_university_id }, index) =>
            !universityList.includes(fk_university_id, index + 1));
            if(this.universities && this.universities.length > 0){
                this.marksSetupForm.get('universityId').setValue(this.universities[0].fk_university_id);
                this.selectedUniversity(this.marksSetupForm.value.universityId);
            }
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.spinner.hide()
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
    // tslint:disable-next-line:typedef
    selectedUniversity(universityId) {
        this.marksSetupForm.get('courseId').setValue('');
        this.marksSetupForm.get('regulationId').setValue('');
        this.examsMarksSteupList = [];
        this.regulations = [];
        this.courses = [];
        this.courseData =[]
        this.subjectTypes=[];
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        if (universityId !== null && universityId !== '') {
            /*----------- COURSES -----------*/
            // this.crudService.listDetailsByTwoIds(this.courseCrudUrl, universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
            //     .subscribe(result => {
            //         if (result.statusCode === 200) {
            //             if (result.data.resultList && result.data.resultList !== '') {
            //                 this.courses = result.data.resultList;
            //                   if(this.courses && this.courses.length > 0){
            //                     this.marksSetupForm.get('courseId').setValue(this.courses[0].courseId);
            //                     this.selectedCourse(this.marksSetupForm.value.courseId)
            //                   }
            //             } else {
            //                 this.snotifyService.success(result.message, 'Success!');
            //             }
            //         } else {
            //             this.snotifyService.error(result.message, 'Error!');
            //         }
            //     }, error => {
            //         if (error.error.statusCode === 401) {
            //             this.snotifyService.error(error.error.message, 'Error!');
            //             this.genericFunctions.logOut(this.router.url);
            //         } else {
            //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            //         }
            //     });
            this.courseData = this.filtersdata.filter(x=>(x.fk_university_id === this.marksSetupForm.value.universityId));
            if(this.courseData.length > 0){
            const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
                    this.courses = this.courseData.filter(({ fk_course_id }, index) =>
                        !Course_Id.includes(fk_course_id, index + 1));
            }
            if(this.courses.length > 0){
                this.marksSetupForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.marksSetupForm.value.courseId); 
            }
        }
    }

    selectedCourse(courseId): void {
        this.examsMarksSteupList = [];
        this.regulations = [];
        this.regData =[];
        this.subjectTypes=[];
        this.marksSetupForm.get('regulationId').setValue('');
        this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
        if (courseId !== null && courseId !== undefined && this.marksSetupForm.value.courseId !== null && this.marksSetupForm.value.courseId !== undefined) {
            this.regData = this.regulationData.filter(x=>(x.fk_university_id === this.marksSetupForm.value.universityId && x.fk_course_id === this.marksSetupForm.value.courseId));
            if(this.regData.length > 0){
            const regulation_Id = this.regData.map(({ fk_regulation_id }) => fk_regulation_id);
                    this.regulations = this.regData.filter(({ fk_regulation_id }, index) =>
                        !regulation_Id.includes(fk_regulation_id, index + 1));
            }
            /*----------- Regulations -----------*/
            // tslint:disable-next-line:max-line-length
            // this.crudService.listDetailsByTwoIdsWithSort(this.regulationCrudUrl, this.marksSetupForm.value.courseId, 'true', 'desc',
            // this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
            //     .subscribe(result => {
            //         if (result.statusCode === 200) {
            //             if (result.data.resultList && result.data.resultList !== '') {
            //                 this.regulations = result.data.resultList;

            //             } else {
            //                 this.snotifyService.success(result.message, 'Success!');
            //             }
            //         } else {
            //             this.snotifyService.error(result.message, 'Error!');
            //         }
            //     }, error => {
            //         if (error.error.statusCode === 401) {
            //             this.snotifyService.error(error.error.message, 'Error!');
            //             this.genericFunctions.logOut(this.router.url);
            //         } else {
            //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            //         }
            //     });

        }
    }

    // getSubjectTypes(): void {
    //     this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectType, 'true', this.generalDetailsByCodeUrl, this.isActive)
    //         .subscribe(result => {
    //             if (result.statusCode === 200) {
    //                 if (result.data.resultList && result.data.resultList !== '') {
    //                     this.subjectTypes = result.data.resultList;
    //                     if (this.examMarksList.length > 0) {
    //                         // tslint:disable-next-line: prefer-for-of
    //                         for (let j = 0; j < this.examMarksList.length; j++) {
    //                             this.examMarksList[j].generalDetailCode = this.examMarksList[j].subjectTypeCatCode;
    //                             // this.examMarksList[j].externalPassPercentage=0
    //                         }
    //                         // tslint:disable-next-line: prefer-for-of
    //                         for (let i = 0; i < this.subjectTypes.length; i++) {
    //                             if (this.examMarksList.filter(x => (x.generalDetailCode === this.subjectTypes[i].generalDetailCode)).length === 0){
    //                                 this.subjectTypes[i].subjectTypeCatId = this.subjectTypes[i].generalDetailId;
    //                                 this.examMarksList.push(this.subjectTypes[i]);
    //                             }
    //                         }
    //                     } else {
    //                         this.examMarksList = this.subjectTypes;
    //                         for (let i = 0; i < this.subjectTypes.length; i++) {
    //                             this.examMarksList[i].subjectTypeCatId = this.subjectTypes[i].generalDetailId;
    //                         }
    //                     }
    //                     // for (let j = 0; j < this.examMarksList.length; j++) {
    //                     //     if (!(this.examMarksList[j].generalDetailCode === "THEORY" || this.examMarksList[j].generalDetailCode === "ELECTIVE")) {
    //                     //         this.examMarksList[j].externalPassPercentage = 0;
    //                     //     }
                            
    //                     // }
                        
    //                 } else {
    //                     this.snotifyService.success(result.message, 'Success!');
    //                 }
    //             } else {
    //                 this.snotifyService.error(result.message, 'Error!');
    //             }
    //         }, error => {
    //             if (error.error.statusCode === 401) {
    //                 this.snotifyService.error(error.error.message, 'Error!');
    //                 this.genericFunctions.logOut(this.router.url);
    //             } else {
    //                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //             }
    //         });
    // }

    getSubjectCategory(): void {
        this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.subjectCategory, 'true', this.generalDetailsByCodeUrl, this.isActive)
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.subjectTypes = result.data.resultList;
                        if (this.examMarksList.length > 0) {
                            // tslint:disable-next-line: prefer-for-of
                            for (let j = 0; j < this.examMarksList.length; j++) {
                                this.examMarksList[j].generalDetailId = this.examMarksList[j].subjectCategoryCatDetId;
                                // this.examMarksList[j].externalPassPercentage=0
                            }
                            // tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.subjectTypes.length; i++) {
                                if (this.examMarksList.filter(x => (x.subjectCategoryCatDetId === this.subjectTypes[i].generalDetailId)).length === 0){
                                    this.subjectTypes[i].subjectCategoryCatDetId = this.subjectTypes[i].generalDetailId;
                                    this.examMarksList.push(this.subjectTypes[i]);
                                }
                            }
                        } else {
                            this.examMarksList = this.subjectTypes;
                            for (let i = 0; i < this.subjectTypes.length; i++) {
                                this.examMarksList[i].subjectCategoryCatDetId = this.subjectTypes[i].generalDetailId;
                            }
                        }
                        // for (let j = 0; j < this.examMarksList.length; j++) {
                        //     if (!(this.examMarksList[j].generalDetailCode === "THEORY" || this.examMarksList[j].generalDetailCode === "ELECTIVE")) {
                        //         this.examMarksList[j].externalPassPercentage = 0;
                        //     }
                            
                        // }
                        
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

    selectedRegulation(): void {
        this.examMarksList = [];
        this.subjectTypes = [];
        // this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl, this.marksSetupForm.value.courseId, this.marksSetupForm.value.regulationId, 'true',
        // this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'isActive')
        //     .subscribe(result => {
        //         this.spinner.hide();
        //         this.getSubjectCategory();
        //         if (result.statusCode === 200) {
        //             if (result.data.resultList && result.data.resultList !== '') {
        //                 this.examMarksList = result.data.resultList;
        //             } else {
        //                 this.snotifyService.success(result.message, 'Success!');
        //             }
        //         } else {
        //             this.snotifyService.error(result.message, 'Error!');
        //         }
        //     }, error => {
        //         this.spinner.hide();
        //         if (error.error.statusCode === 401) {
        //             this.snotifyService.error(error.error.message, 'Error!');
        //             this.genericFunctions.logOut(this.router.url);
        //         } else {
        //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //         }
        //     });
    }

    calInternalPer(e, item): void{
       item.passPercentage = e.target.value;
    }

    // calExternalPer(e, item): void{
    //    item.externalPassPercentage = e.target.value;
    // }

    selectedFlag(){
        this.examMarksList = [];
        this.subjectTypes = [];
    }

    getDetails(){
        this.examMarksList = [];
        this.subjectTypes = [];
        this.spinner.show();
        // tslint:disable-next-line: max-line-length
        this.crudService.listDetailsByFourIds(this.examMarksSetupUrl, this.marksSetupForm.value.courseId, this.marksSetupForm.value.regulationId, this.marksSetupForm.value.isForDisabled, 'true',
        this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'disabled', 'isActive')
            .subscribe(result => {
                this.spinner.hide();
                this.getSubjectCategory();
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examMarksList = result.data.resultList;
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

    submit(): void {
        this.spinner.show();
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < this.examMarksList.length; i++) {
            this.examMarksList[i].regulationId = this.marksSetupForm.value.regulationId;
            this.examMarksList[i].universityId = this.marksSetupForm.value.universityId;
            this.examMarksList[i].courseId = this.marksSetupForm.value.courseId;
            this.examMarksList[i].isForDisabled = this.marksSetupForm.value.isForDisabled;
        }
        /*---------- ADD EXAM MARKS SETUP ----------*/
        this.crudService.add(this.exammarkssetupUrl, this.examMarksList)
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    // this.selectedRegulation();
                    this.getDetails();
                    this.snotifyService.success(result.message, 'Success!');

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

    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

}
