import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { Regulations } from 'app/main/models/Rregulations';
import { MarksSetup } from 'app/main/models/marksSetup';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamGradesModalComponent } from './exam-grades-modal/exam-grades-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-exam-grades',
  templateUrl: './exam-grades.component.html',
  styleUrls: ['./exam-grades.component.scss']
})
export class ExamGradesComponent implements OnInit {

  displayedColumns: string[] = ['id', 'gradeCode', 'gradeName', 'minPoints', 'minScorePercent', 'creditPoints', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private universitiesUrl = CONSTANTS.universitiesUrl;
  private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private examGradeUrl = CONSTANTS.examGradeUrl;
  private examGradesIdUrl = CONSTANTS.examGradesIdUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private regulationCrudUrl = CONSTANTS.regulationCrudUrl;
  private getDetailsByRegulationIdUrl = CONSTANTS.getDetailsByRegulationIdUrl;
  private isActive = CONSTANTS.isActive;
  private collegeWiseDetails=CONSTANTS.collegeWiseDetailsUrl

  examGradesForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  regulations: Regulations[] = [];
  step = 0;  
  examsMarksSteupList: MarksSetup[] = [];
  examGrades: any = {};
  item: any = {};
  universities = [];
  filtersDetailsList =[]
  filtersdata=[]
  regulationData=[]
  courseData=[];
  regData = [];
  flag = false;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private genericFunctions: GenericFunctions) {        
    //   this.getData();
     this.getfilterDetails();

                // this.getUniversity();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {       
    this.examGradesForm = this.formBuilder.group({
        universityId: ['', Validators.required],
        // collegeId: ['', Validators.required],
        academicYearId: ['', ],
        courseId: ['', Validators.required],        
        regulationId: ['', Validators.required],
        isForDisabled: [false]
      }); 
    this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

//   getData(): void{
//     /*----------- COLLEGES -----------*/
//     this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
//          .subscribe(result => {
//              if (result.statusCode === 200){
//                      if (result.data.resultList && result.data.resultList !== '') {
//                          this.colleges = result.data.resultList;   
//                          if (this.colleges.length > 0){
//                           this.examGradesForm.get('collegeId').setValue(this.colleges[0].collegeId);
//                           this.selectedCollege(this.examGradesForm.value.collegeId); 
//                        }                   
//                      } else {
//                          this.snotifyService.success(result.message, 'Success!');
//                      }
//                  }else {
//               this.snotifyService.error(result.message, 'Error!');
//           }
            
//          }, error => {
//           if (error.error.statusCode === 401){
//               this.snotifyService.error(error.error.message, 'Error!');
//               this.genericFunctions.logOut(this.router.url);
//           }else{
//               this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//           }
//     });
//   }
/*---------- GET UNVERSITIES ----------*/
getUniversity(): void {
    this.crudService.listDetailsById(this.universitiesUrl, 'true', this.isActive)
      .subscribe(result => {
        if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
            this.universities = result.data.resultList;
            if (this.universities && this.universities.length > 0) {
                this.examGradesForm.get('universityId').setValue(this.universities[0].universityId);
                this.selectedUniversity(this.examGradesForm.value.universityId);
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
            this.examGradesForm.get('universityId').setValue(this.universities[0].fk_university_id);
            this.selectedUniversity(this.examGradesForm.value.universityId);
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
  selectedUniversity(universityId){
      this.examGradesForm.get('courseId').setValue('');
      this.examGradesForm.get('regulationId').setValue('');
      this.examsMarksSteupList = [];
      this.regulations = [];
      this.courses = [];
      this.courseData =[]
      this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
      if (universityId !== null && universityId !== ''){
    /*----------- COURSES -----------*/
    this.courseData = this.filtersdata.filter(x=>(x.fk_university_id === this.examGradesForm.value.universityId));
    if(this.courseData.length > 0){
    const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.courseData.filter(({ fk_course_id }, index) =>
                !Course_Id.includes(fk_course_id, index + 1));
    }
    if(this.courses.length > 0){
        this.examGradesForm.get('courseId').setValue(this.courses[0].fk_course_id);
        this.selectedCourse(this.examGradesForm.value.courseId); 
    }
//     this.crudService.listDetailsByTwoIds(this.courseCrudUrl, universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
//     .subscribe(result => {
//         if (result.statusCode === 200){
//                 if (result.data.resultList && result.data.resultList !== '') {
//                     this.courses = result.data.resultList; 
//                      if(this.courses && this.courses.length > 0){
//                           this.examGradesForm.get('courseId').setValue(this.courses[0].courseId);
//                           this.selectedCourse(this.examGradesForm.value.courseId)
//                      }
//                 } else {
//                     this.snotifyService.success(result.message, 'Success!');
//                 }
//             }else {
//               this.snotifyService.error(result.message, 'Error!');
//           }
        
//     }, error => {
//       if (error.error.statusCode === 401){
//           this.snotifyService.error(error.error.message, 'Error!');
//           this.genericFunctions.logOut(this.router.url);
//       }else{
//           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//       }
// });
}
  }

  selectedCourse(courseId): void{
      this.flag = false;
      this.examsMarksSteupList = [];
      this.regulations = [];
      this.examGradesForm.get('regulationId').setValue('');
      this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
      if (courseId !== null && courseId !== undefined && this.examGradesForm.value.courseId !== null && this.examGradesForm.value.courseId !== undefined){
    /*----------- Regulations -----------*/
        // tslint:disable-next-line:max-line-length
        // this.crudService.listDetailsByTwoIdsWithSort(this.regulationCrudUrl, this.examGradesForm.value.courseId, 'true', 'desc',
        // this.getDetailsByCourseIdUrl, this.isActive, 'regulationCode')
        // .subscribe(result => {
        //     if (result.statusCode === 200) {
        //         if (result.data.resultList && result.data.resultList !== '') {
        //             this.regulations = result.data.resultList;
                   
        //         } else {
        //             this.snotifyService.success(result.message, 'Success!');
        //         }
        //     } else {
        //         this.snotifyService.error(result.message, 'Error!');
        //     }
        // }, error => {
        //     if (error.error.statusCode === 401){
        //         this.snotifyService.error(error.error.message, 'Error!');
        //         this.genericFunctions.logOut(this.router.url);
        //     }else{
        //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //     }
        // });
        this.regData = this.regulationData.filter(x=>(x.fk_university_id === this.examGradesForm.value.universityId && x.fk_course_id === this.examGradesForm.value.courseId));
        if(this.regData.length > 0){
        const regulation_Id = this.regData.map(({ fk_regulation_id }) => fk_regulation_id);
                this.regulations = this.regData.filter(({ fk_regulation_id }, index) =>
                    !regulation_Id.includes(fk_regulation_id, index + 1));
        }
   
  }
  }
  selectedRegulation(regulationId): void{
    this.flag = false;
    this.examsMarksSteupList = [];
    this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
//     if (regulationId !== null && regulationId !== undefined && this.examGradesForm.value.courseId !== null && this.examGradesForm.value.courseId !== undefined){
//     /*-----------Exams -----------*/      
//     this.spinner.show();          
//     this.crudService.listDetailsByTwoIds(this.examGradeUrl, this.examGradesForm.value.courseId, this.examGradesForm.value.regulationId,
//         this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl)
//       .subscribe(result => {
//         this.spinner.hide();
//         if (result.statusCode === 200){
//               if (result.data && result.data !== '') {
//                   this.examsMarksSteupList = result.data.resultList;
//                   // Assign the data to the data source for the API
//                   this.dataSource = new MatTableDataSource(this.examsMarksSteupList);
//                   this.dataSource.paginator = this.paginator;
//                   this.dataSource.sort = this.sort;
//               } else {
//                   this.snotifyService.success(result.message, 'Success!');
//               }
//         }else {
//           this.snotifyService.error(result.message, 'Error!');
//       }
//       }, error => {
//           this.spinner.hide();
//           if (error.error.statusCode === 401){
//               this.snotifyService.error(error.error.message, 'Error!');
//               this.genericFunctions.logOut(this.router.url);
//         }else{
//             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//         }
//       });
// }
}
selectedFlag(){
  this.flag = false;
  this.examsMarksSteupList = [];
  this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
}

getDetails(){
  this.flag = true;
  this.examsMarksSteupList = [];
  this.dataSource = new MatTableDataSource<any>(this.examsMarksSteupList);
  if (this.examGradesForm.valid){
    /*-----------Exams -----------*/      
    this.spinner.show();          
    this.crudService.listDetailsByThreeIds(this.examGradeUrl, this.examGradesForm.value.courseId, this.examGradesForm.value.regulationId, this.examGradesForm.value.isForDisabled,
        this.getDetailsByCourseIdUrl, this.getDetailsByRegulationIdUrl, 'disabled')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.examsMarksSteupList = result.data.resultList;
                  this.dataSource = new MatTableDataSource(this.examsMarksSteupList);
                  this.dataSource.paginator = this.paginator;
                  this.dataSource.sort = this.sort;
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
}else{
    this.snotifyService.info('Please Select required Filters', 'Info!');
}
}
openDialog(): void {
  this.item = {};
  this.item.universityCode = this.universities.filter(x => (x.fk_university_id === this.examGradesForm.value.universityId))[0].university_code;
  this.item.courseCode = this.courses.filter(x => (x.fk_course_id === this.examGradesForm.value.courseId))[0].course_code;
  this.item.regulationCode = this.regulations.filter(x => (x.fk_regulation_id === this.examGradesForm.value.regulationId))[0].regulation_code;
  this.item.isForDisabled = this.examGradesForm.value.isForDisabled;
  const dialogRef = this.dialog.open(ExamGradesModalComponent, {
    width: '750px',
    data: this.item
  });

  dialogRef.afterClosed().subscribe(details => {
    if (details != null && details !== ''){  
        this.spinner.show();
        // details.collegeId = this.examGradesForm.value.collegeId;
        details.universityId = this.examGradesForm.value.universityId;
        details.courseId = this.examGradesForm.value.courseId;
        details.regulationId = this.examGradesForm.value.regulationId;
        details.isForDisabled = this.examGradesForm.value.isForDisabled;
        /*---------- ADD EXAM GRADE ----------*/
        this.crudService.addDetails(this.examGradeUrl, details)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.snotifyService.success(result.message, 'Success!');
                    // this.selectedRegulation(this.examGradesForm.value.regulationId);
                    this.getDetails();
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
});

}

/*---------- EDIT EXAM GRADE -----------*/
editDialog(data): void {
    this.examGrades = data;
    const dialogRef = this.dialog.open(ExamGradesModalComponent, {
    width: '750px',
    data: this.examGrades
    });

    dialogRef.afterClosed().subscribe(details => {
        if (details != null && details !== ''){
            details.examGradesId = this.examGrades.examGradesId;
            this.UpdateExamGrades(details);
            
        }
    });
}

  /*------------ UPDATE EXAM GRADE -----------*/
  UpdateExamGrades(details): void{
    this.spinner.show();
    this.crudService.updateDetails(this.examGradeUrl, details, details.examGradesId, this.examGradesIdUrl)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                // this.selectedRegulation(this.examGradesForm.value.regulationId);
                this.getDetails();
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


  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
      this.dataSource.filter = filterValue.trim().toLowerCase();

      if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
      }
  }

}
