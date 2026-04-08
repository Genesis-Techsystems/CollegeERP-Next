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
  selector: 'app-evaluation-templates',
  templateUrl: './evaluation-templates.component.html',
  styleUrls: ['./evaluation-templates.component.scss']
})
export class EvaluationTemplatesComponent implements OnInit {

  displayedColumns: string[] = ['id', 'templateTitle', 'totalmarks', 'templateDescription', 'templateStatusId', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;

    private universitiesUrl = CONSTANTS.universitiesUrl;
    private examQpTemplateUrl = CONSTANTS.ExamQpTemplateUrl;
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
    private isActive = CONSTANTS.isActive;
    private collegeWiseDetails=CONSTANTS.collegeWiseDetailsUrl
    templateForm: FormGroup;
    colleges: College[] = [];
    courses: Course[] = [];
    regulations: Regulations[] = [];
    step = 0;
    universities = [];
    filtersDetailsList =[]
    filtersdata=[]
    regulationData=[]
    courseData=[];
    regData =[]
    templateList: any[] = [];

    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions) {
        // this.getData();
        this.getfilterDetails();
                    // this.getUniversity();
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.templateForm = this.formBuilder.group({
            universityId: ['', Validators.required],
            // collegeId: ['', Validators.required],
            // academicYearId: ['', Validators.required],
            // courseId: ['', Validators.required],
            // regulationId: ['', Validators.required],
        });
        this.dataSource = new MatTableDataSource<any>(this.templateList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
  
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
                this.templateForm.get('universityId').setValue(this.universities[0].fk_university_id);
                this.selectedUniversity(this.templateForm.value.universityId);
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
        // this.templateForm.get('courseId').setValue('');
        // this.templateForm.get('regulationId').setValue('');
        this.regulations = [];
        this.courses = [];
        this.courseData =[]
        this.dataSource = new MatTableDataSource<any>(this.templateList);
        if (universityId !== null && universityId !== '') {
           this.templateList = [];
        this.spinner.show();
        // tslint:disable-next-line: max-line-length
        this.crudService.listDetailsByTwoIds(this.examQpTemplateUrl, this.templateForm.value.universityId, 'true', 'Universities.universityId', 'isActive')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                     if (result.data && result.data !== '') {
                      this.templateList = result.data.resultList;
                      // Assign the data to the data source for the API
                      this.dataSource = new MatTableDataSource(this.templateList);
                      this.dataSource.paginator = this.paginator;
                      this.dataSource.sort = this.sort;
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
            /*----------- COURSES -----------*/
            
            // this.courseData = this.filtersdata.filter(x=>(x.fk_university_id === this.templateForm.value.universityId));
            // if(this.courseData.length > 0){
            // const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
            //         this.courses = this.courseData.filter(({ fk_course_id }, index) =>
            //             !Course_Id.includes(fk_course_id, index + 1));
            // }
            // if(this.courses.length > 0){
            //     this.templateForm.get('courseId').setValue(this.courses[0].fk_course_id);
            //     this.selectedCourse(this.templateForm.value.courseId); 
            // }
        }
    }

    // selectedCourse(courseId): void {
    //     this.regulations = [];
    //     this.regData =[];
    //     this.templateForm.get('regulationId').setValue('');
    //     this.dataSource = new MatTableDataSource<any>(this.templateList);
    //     if (courseId !== null && courseId !== undefined && this.templateForm.value.courseId !== null && this.templateForm.value.courseId !== undefined) {
    //         this.regData = this.regulationData.filter(x=>(x.fk_university_id === this.templateForm.value.universityId && x.fk_course_id === this.templateForm.value.courseId));
    //         if(this.regData.length > 0){
    //         const regulation_Id = this.regData.map(({ fk_regulation_id }) => fk_regulation_id);
    //                 this.regulations = this.regData.filter(({ fk_regulation_id }, index) =>
    //                     !regulation_Id.includes(fk_regulation_id, index + 1));
    //         }

    //     }
    // }

    // selectedRegulation(): void {
    //     this.templateList = [];
    //     this.spinner.show();
    //     // tslint:disable-next-line: max-line-length
    //     this.crudService.listDetailsByThreeIds(this.examMarksSetupUrl, this.templateForm.value.courseId, this.templateForm.value.regulationId, 'true',
    //     this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'isActive')
    //         .subscribe(result => {
    //             this.spinner.hide();
    //             if (result.statusCode === 200) {
    //                  if (result.data && result.data !== '') {
    //                   this.templateList = result.data.resultList;
    //                   // Assign the data to the data source for the API
    //                   this.dataSource = new MatTableDataSource(this.templateList);
    //                   this.dataSource.paginator = this.paginator;
    //                   this.dataSource.sort = this.sort;
    //         } else {
    //             this.snotifyService.success(result.message, 'Success!');
    //         }
    //             } else {
    //                 this.snotifyService.error(result.message, 'Error!');
    //             }
    //         }, error => {
    //             this.spinner.hide();
    //             if (error.error.statusCode === 401) {
    //                 this.snotifyService.error(error.error.message, 'Error!');
    //                 this.genericFunctions.logOut(this.router.url);
    //             } else {
    //                 this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //             }
    //         });
    // }

    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    createTemplate(){
      this.router.navigate(['admin-examination-management/evaluation-process/questionpaper-template'])
    }

    editTemplate(row: any){
         this.router.navigate(['admin-examination-management/evaluation-process/questionpaper-template'], { queryParams: { 
         universityId: this.templateForm.value.universityId,
         examQpTemplateId: row.examQpTemplateId
       } });
    }

}
