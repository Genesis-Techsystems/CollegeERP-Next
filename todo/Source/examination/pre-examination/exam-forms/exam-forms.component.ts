import { Component, OnInit, ViewChild , ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { AcademicYear } from 'app/main/models/academicYear';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CourseGroup } from 'app/main/models/courseGroup';
import { CourseYear } from 'app/main/models/courseYearRegulation';
import { ExamMaster } from 'app/main/models/examMaster';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import * as XLSX from 'xlsx'
import {Location} from '@angular/common';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-forms',
  templateUrl: './exam-forms.component.html',
  styleUrls: ['./exam-forms.component.scss']
})
export class ExamFormsComponent implements OnInit {


    
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('TABLE',{ read: ElementRef }) table: ElementRef;
  panelOpenState = true;
  
  private getExamFiltersBycodeUrl = CONSTANTS.getExamFiltersBycodeUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private examMasterUrl = CONSTANTS.examMasterUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private isActive = CONSTANTS.isActive;
  private examCourseYearSubjectUrl = CONSTANTS.examCourseYearSubjectUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private subjectWiseModerationUrl = CONSTANTS.subjectWiseModerationUrl;
  private generateBarCodeUrl = CONSTANTS.generateBarCodeUrl;
  private getExamAllotmentDetailsUrl = CONSTANTS.getExamAllotmentDetailsUrl;

  examFeeCollectionForm: FormGroup;
  colleges= [];
  academicYears = [];
  courses = [];
  examsList= [];
  examDuplicateList = [];
  courseGroups= [];
  courseYears= [];
  courseYearSubjects = [];
  courseYearSubjectsByType: any[] = [];
  students: any[] = [];
  allStudentSubects: any[] = [];
  selectedStudents: any[] = [];
  examType: any[] = [];
  checksubject = true;
  public searchText: string;
  public searchText1: string;
  public searchText2: string;
  registeredStudents: any[] = [];
  subjectModerationStudents: any[] = [];
  studentdata: any=[];
  GenerateBarCodeData:any[] = [];
  selectedData: any;
  collegeName : any
    CollegeName: any;
    examname: any;
  pageParams :any={};
    groupName: CourseGroup[];
    selectedSubjects = []
    collegeCode: any;
    academicyear: any;
    courseCode: any;
    courseGroupCode: any;
    courseYear: any;
    collegesLogo = [];
    Logo:any;
    filtersDetailsList = [];
    filtersdata = [];
    academicyears = [];
    courseData = [];
    coursegroup = [];
    courseYearData = [];
    examsLists = [];
    SubjectList = [];
  CollegesListFilterDetails: any;
  academicYearsList: any[];
  examData: any[];
  regulationFilterList: any;
  CollegesListDetails: any;
  courseGroupList: any[];
  courseYearsList: any[];
  regulationList: any[];
  subjectsList: any[];
  subjectsDetailList: any[];
  subjectData: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, private paramaters:ParametersService,
              private dialog: MatDialog, private genericFunctions: GenericFunctions,  private _location: Location, private route: ActivatedRoute) {
      this.getData();
      this.getFiltersList();
      this.dataSource = new MatTableDataSource<any>(this.students);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
      this.examFeeCollectionForm = this.formBuilder.group({
          collegeId: ['', Validators.required],
          academicYearId: ['', Validators.required],
          courseId: ['', Validators.required],
          courseGroupId: ['', Validators.required],
          courseYearId: ['', Validators.required],
          examId: ['', Validators.required],
          studentId: [''],
          subjectId: ['', Validators.required],
          regulationId: ['', Validators.required],


      });
      
      if(this.paramaters.AFormData && this.paramaters.AFormData.length > 0){
        this.pageParams = this.paramaters.AFormData[0];
        this.examFeeCollectionForm.get('collegeId').setValue(+this.pageParams.collegeId);
        this.examFeeCollectionForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
        this.examFeeCollectionForm.get('courseId').setValue(+this.pageParams.courseId);
        this.examFeeCollectionForm.get('courseGroupId').setValue(+this.pageParams.courseGroupId);
        this.examFeeCollectionForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
        this.examFeeCollectionForm.get('examId').setValue(+this.pageParams.examId);
        this.examFeeCollectionForm.get('regulationId').setValue(+this.pageParams.regulationId);
        this.examFeeCollectionForm.get('subjectId').setValue(+this.pageParams.subjectId);
      }
  }

  ExportTOExcel(){
    {
        this.table.nativeElement.style.background = "red";
        const ws: XLSX.WorkSheet=XLSX.utils.table_to_sheet(this.table.nativeElement);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
        /* save to file */
        XLSX.writeFile(wb,'SheetJS.xlsx');
    
      }
  }
  getData(): void {
      /*----------- COLLEGES -----------*/
      this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.collegesLogo = result.data.resultList;
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

  getFiltersList(): void {
    this.spinner.show()
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
      { paramName: 'in_flag_type', paramValue: 'REGSUP' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: 0 },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: 0 },
      { paramName: 'in_academic_year_id', paramValue: 0 },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
                this.CollegesListFilterDetails = this.filtersDetailsList[i];
              }
            }
            const Course_Id = this.CollegesListFilterDetails.map(({ fk_course_id }) => fk_course_id);
            this.courses = this.CollegesListFilterDetails.filter(({ fk_course_id }, index) =>
              !Course_Id.includes(fk_course_id, index + 1));
            
            if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0) {
              this.examFeeCollectionForm.get('courseId').setValue(+this.pageParams.courseId);
              this.selectedCourse(this.examFeeCollectionForm.value.courseId)

            }
            else
              if (this.courses.length > 0) {
                this.examFeeCollectionForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.examFeeCollectionForm.value.courseId)
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

  selectedCourse(courseId): void {
  this.courseCode = this.courses.filter(x=>x.fk_course_id == this.examFeeCollectionForm.value.courseId)[0]?.course_code;

    if (courseId != null) {
      this.examFeeCollectionForm.get('academicYearId').setValue('')
      this.examFeeCollectionForm.get('examId').setValue('');
      this.examFeeCollectionForm.get('collegeId').setValue('');
      this.examFeeCollectionForm.get('courseGroupId').setValue('');
      this.examFeeCollectionForm.get('courseYearId').setValue('');
      this.examFeeCollectionForm.get('regulationId').setValue('');
      this.examFeeCollectionForm.get('subjectId').setValue('');
      this.academicYears = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.academicYearsList = []

      this.academicYearsList = this.CollegesListFilterDetails.filter(x => (x.fk_course_id == this.examFeeCollectionForm.value.courseId))
      if (this.academicYearsList.length > 0) {
        const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
      }
      if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0) {
          this.examFeeCollectionForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
          this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
          this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId);
      }
      else
        if (this.academicYears && this.academicYears.length > 0) {
            const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
          if (currentAY?.fk_academic_year_id) {
            this.examFeeCollectionForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
          }
            this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
            // this.examFeeCollectionForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
            this.selectedAcademicYear(this.examFeeCollectionForm.value.academicYearId);
        }
    }
  }

  selectedAcademicYear(academicYearId): void {
  this.academicyear = this.academicYears.filter(x=>x.fk_academic_year_id == this.examFeeCollectionForm.value.academicYearId)[0]?.academic_year

    this.examFeeCollectionForm.get('examId').setValue('');
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examsList = [];
    if (academicYearId) {
      this.examsLists = []
      this.examData = []
      this.colleges = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.examsLists = this.CollegesListFilterDetails.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId && x.fk_academic_year_id == this.examFeeCollectionForm.value.academicYearId))
      if (this.examsLists.length > 0) {
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
      }
      if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0) {
        this.examFeeCollectionForm.get('examId').setValue(+this.pageParams.examId);
        this.selectedExam(this.examFeeCollectionForm.value.examId);

      }
      else
        if (this.examsList.length > 0) {
          this.examFeeCollectionForm.get('examId').setValue(this.examsList[0].fk_exam_id);
          this.selectedExam(this.examFeeCollectionForm.value.examId);
        }
    }

  }
  selectedExam(examId): void {
    this.filtersDetailsList = []
    this.examname=this.examsList.filter(x=>x.fk_exam_id == this.examFeeCollectionForm.value.examId)[0]?.exam_name;
    console.log(this.examname,'this.examname');
    
    this.examFeeCollectionForm.get('collegeId').setValue('');
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');

    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_rest_no_tt' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: 0 },
      { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: 0 },
      { paramName: 'in_course_year_id', paramValue: 0 },
      { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: 0 },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_rest_filters') {
                this.CollegesListDetails = this.filtersDetailsList[i];
              }
              else if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'regulations') {
                this.regulationFilterList = this.filtersDetailsList[i];
              }

            }
            this.colleges = []
            this.courseGroups = []
            this.courseYears = []
            this.regulationList = []
            this.subjectData = []
            if (this.CollegesListDetails) {
              /*----------- Colleges -----------*/
            
              this.colleges = this.CollegesListDetails
              const CollegeIdData = this.colleges.map(({ fk_college_id }) => fk_college_id);
              this.colleges = this.colleges.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
              if (!this.isEmptyObject(this.pageParams) && this.colleges.length > 0) {
                this.examFeeCollectionForm.get('collegeId').setValue(+this.pageParams.collegeId);
                this.selectedCollege(this.examFeeCollectionForm.value.collegeId);

              }
              else
                if (this.colleges.length > 0) {
                  this.examFeeCollectionForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                  this.selectedCollege(this.examFeeCollectionForm.value.collegeId);
                }
              //     /*----------- COURSES Years -----------*/      


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
  selectedCollege(collegeId): void {
    this.collegeCode = this.colleges.filter(x=>x.fk_college_id == this.examFeeCollectionForm.value.collegeId)[0]?.college_code;
    this.Logo = this.collegesLogo.filter(x=>x.collegeId == this.examFeeCollectionForm.value.collegeId)[0]?.logo;
    this.courseGroups = []
    this.examFeeCollectionForm.get('courseGroupId').setValue('');
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    if (collegeId != null) {
      this.courseGroupList = []
      this.courseGroups = []
      this.courseYears = []
      this.regulationList = []
      this.subjectData = []
      this.courseGroupList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId))
      if (this.courseGroupList.length > 0) {
        const courseGroups = this.courseGroupList.map(({ fk_course_group_id }) => fk_course_group_id);
        this.courseGroups = this.courseGroupList.filter(({ fk_course_group_id }, index) => !courseGroups.includes(fk_course_group_id, index + 1));
      }
      if (!this.isEmptyObject(this.pageParams) && this.courseGroups.length > 0) {
        this.examFeeCollectionForm.get('courseGroupId').setValue(+this.pageParams.courseGroupId);
        this.selectedGroup(this.examFeeCollectionForm.value.courseGroupId)

      }
      else
        if (this.courseGroups.length > 0) {
          this.examFeeCollectionForm.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
          this.selectedGroup(this.examFeeCollectionForm.value.courseGroupId)
        }
    }


  }



  selectedGroup(courseGroupId): void {
    this.courseGroupCode = this.courseGroups.filter(x=>x.fk_course_group_id == this.examFeeCollectionForm.value.courseGroupId)[0]?.group_code

    this.groupName = this.courseGroups.filter(x=> x.fk_course_group_id == courseGroupId )
    this.examFeeCollectionForm.get('courseYearId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.courseYearsList = []
    this.courseYears = []
    this.regulationList = []
    this.subjectData = []

    /*----------- COURSES Years -----------*/
    this.courseYearsList = this.CollegesListDetails.filter(x => (x.fk_college_id == this.examFeeCollectionForm.value.collegeId && x.fk_course_group_id == courseGroupId))
    if (this.courseYearsList.length > 0) {
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
    }
         if (!this.isEmptyObject(this.pageParams) && this.courseYears.length > 0){
          this.examFeeCollectionForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
          this.selectedYear( this.examFeeCollectionForm.value.courseYearId);
    } 
       else 
    if (this.courseYears.length > 0) {
      this.examFeeCollectionForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
      this.selectedYear(this.examFeeCollectionForm.value.courseYearId);
    }
  }
  selectedYear(courseYearId) {
  this.courseYear = this.courseYears.filter(x=>x.fk_course_year_id == this.examFeeCollectionForm.value.courseYearId)[0]?.course_year_code

    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.examFeeCollectionForm.get('regulationId').setValue('');
    this.regulationList = []
    this.subjectData = []
    if (courseYearId) {
      if (this.regulationFilterList.length > 0) {
        const regulationDetailList = this.regulationFilterList.map(({ fk_regulation_id }) => fk_regulation_id);
        this.regulationList = this.regulationFilterList.filter(({ fk_regulation_id }, index) => !regulationDetailList.includes(fk_regulation_id, index + 1));
      }
      if (!this.isEmptyObject(this.pageParams) && this.regulationList.length > 0) {
        console.log(this.pageParams,'this.pageParamsthis.pageParams');
        
        this.examFeeCollectionForm.get('regulationId').setValue(+this.pageParams.regulationId);
        this.selectedRegulation(this.examFeeCollectionForm.value.regulationId)

      }
      else
        if (this.regulationList.length > 0) {
          // this.bulkHallticketDetails =[]
          // this.bulkTable=false

          this.examFeeCollectionForm.get('regulationId').setValue(this.regulationList[0].fk_regulation_id);
          this.selectedRegulation(this.examFeeCollectionForm.value.regulationId)
        }

    }
  }

  selectedRegulation(regulationId): void {
    this.examFeeCollectionForm.get('subjectId').setValue('');
    this.subjectsDetailList = []
    this.subjectData = []
    this.subjectsList = []
    let request = [
      { paramName: 'in_flag', paramValue: 'univ_exam_subject_uc' },
      { paramName: 'in_flag_type', paramValue: 'ALL' },
      { paramName: 'in_university_id', paramValue: 0 },
      { paramName: 'in_college_id', paramValue: this.examFeeCollectionForm.value.collegeId },
      { paramName: 'in_course_id', paramValue: this.examFeeCollectionForm.value.courseId },
      { paramName: 'in_course_group_id', paramValue: this.examFeeCollectionForm.value.courseGroupId },
      { paramName: 'in_course_year_id', paramValue: this.examFeeCollectionForm.value.courseYearId },
      { paramName: 'in_exam_id', paramValue: this.examFeeCollectionForm.value.examId },
      { paramName: 'in_academic_year_id', paramValue: this.examFeeCollectionForm.value.academicYearId },
      { paramName: 'in_regulation_id', paramValue: this.examFeeCollectionForm.value.regulationId },
      { paramName: 'in_subject_id', paramValue: 0 },
      { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
      { paramName: 'in_loginuser_roleid', paramValue: 0 },
      { paramName: 'in_sub_flag_type', paramValue: 'ALL' },
      { paramName: 'in_param1', paramValue: 0 },
      { paramName: 'in_param2', paramValue: 0 },
    ];
    this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
      .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
          if (result.data && result.data !== '' && result.data.result.length > 0) {
            this.filtersDetailsList = result.data.result;
            for (let i = 0; i < this.filtersDetailsList.length; i++) {
              if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_sub_uc') {
                this.subjectsDetailList = this.filtersDetailsList[i];
              }
            }
            if (this.subjectsDetailList) {
              if (this.subjectsDetailList.length > 0) {
                const subjectsDetailList = this.subjectsDetailList.map(({ fk_subject_id }) => fk_subject_id);
                this.subjectsList = this.subjectsDetailList.filter(({ fk_subject_id }, index) => !subjectsDetailList.includes(fk_subject_id, index + 1));
                this.subjectData = this.subjectsList;
              }
              if (!this.isEmptyObject(this.pageParams) && this.subjectData.length > 0) {
                this.examFeeCollectionForm.get('subjectId').setValue(+this.pageParams.subjectId);
                this.getDetails();
              }
              else
                if (this.subjectsList.length > 0) {
                  this.examFeeCollectionForm.get('subjectId').setValue(this.subjectsList[0].fk_subject_id);
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


  searchexam(value) {
    this.examData = [];
    this.search(value)
  }

  search(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examData.push(option);
      }
    }
  }

  searchSubject(value) {
    this.subjectData = [];
    this.searchsubject(value)
  }

  searchsubject(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.subjectsDetailList.length; i++) {
      let option = this.subjectsDetailList[i];
      if (option.subject_name.toLowerCase().indexOf(filter) >= 0) {
        this.subjectData.push(option);
      } else
        if (option.subject_code.toLowerCase().indexOf(filter) >= 0) {
          this.subjectData.push(option);
        }
    }
  }
selectedSubject(subjectId): void{
    this.students = [];
    this.selectedStudents = [];
    this.registeredStudents = [];
    this.subjectModerationStudents = [];
    this.searchText = '';
    this.searchText1 = '';
    this.searchText2 = '';
//  this.students = this.courseYearSubjectsByType.filter(x => ( x.subjectId === subjectId));
    this.dataSource = new MatTableDataSource<any>(this.students);
  
}

getDetails(): void{ 
    if (this.examFeeCollectionForm.valid){
        
        this.spinner.show();
        this.subjectModerationStudents = [];

        this.selectedData = this.colleges.filter(x => (x.fk_college_id === this.examFeeCollectionForm.value.collegeId))[0]?.college_code;
        this.selectedData = this.selectedData + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.examFeeCollectionForm.value.academicYearId))[0]?.academic_year;
        this.selectedData = this.selectedData + ' / ' + this.courses.filter(x => (x.fk_course_id === this.examFeeCollectionForm.value.courseId))[0]?.course_code;
        this. selectedData = this.selectedData + ' / ' + this.courseGroups.filter(x => (x.fk_course_group_id === this.examFeeCollectionForm.value.courseGroupId))[0]?.group_code;
        this.selectedData = this.selectedData + ' / ' + this.courseYears.filter(x => (x.fk_course_year_id === this.examFeeCollectionForm.value.courseYearId))[0]?.course_year_name;
        
        // this.selectedData = this.selectedData + ' / ' + this.courseYearSubjects.filter(x => (x.subjectId === this.examFeeCollectionForm.value.subjectId))[0]?.subjectName;

        /*----------- STUDENTS -----------*/
       // tslint:disable-next-line:max-line-length
        this.crudService.listByFourteenIds(this.getExamAllotmentDetailsUrl, 'exam_OMR_students', 
        this.examFeeCollectionForm.value.examId,
        this.examFeeCollectionForm.value.collegeId,
        0,
        this.examFeeCollectionForm.value.courseGroupId,
        this.examFeeCollectionForm.value.courseYearId,
        0,
        0,
        0,
        0,
        '1999-01-01',
        '1999-01-01',
        this.examFeeCollectionForm.value.subjectId,0,
        'in_flag', 'in_exam_id','in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id','in_std_id', 'in_invgilator_emp_id',
        'in_regulation_id', 'from_exam_date', 'to_exam_date', 'in_subject_id','in_session_id')
         .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                   if (result.success) {
                       if (result.data.result[0].length > 0){
                            this.subjectModerationStudents = [];
                            for (let i = 0; i < result.data.result[0].length; i++){
                                this.subjectModerationStudents.push({

                                    hallticket_number: result.data.result[0][i].hallticket_number,
                                    StudentName: result.data.result[0][i].student_name,
                                    examStdDetId: result.data.result[0][i].fk_exam_std_det_id,
                                    omr_serial_no: result.data.result[0][i].omr_serial_no,
                                    omr_barcode: result.data.result[0][i].omr_barcode,
                                    father_name: result.data.result[0][i].father_name,
                                    caste: result.data.result[0][i].caste,
                                    date_of_birth: result.data.result[0][i].date_of_birth,
                                    gender: result.data.result[0][i].gender,
                                    aadhar_card_no: result.data.result[0][i].aadhar_card_no,
                                    exam_name: result.data.result[0][i].exam_name,
                                    examcenter: result.data.result[0][i].examcenter,
                                    room_number: result.data.result[0][i].room_number,
                                    subject_code: result.data.result[0][i].subject_code,
                                    subject_name: result.data.result[0][i].subject_name,
                                    exam_date: result.data.result[0][i].exam_date,
                                    sessin_time:result.data.result[0][i].sessin_time,
                                    exam_session_name:result.data.result[0][i].exam_session_name,
                                    isPresent:result.data.result[0][i].is_present,
                                    college_name:result.data.result[0][i].college_name,
                                    group_code:result.data.result[0][i].group_code,
                                    university_code: result.data.result[0][i].university_code,
                                    isUfm: result.data.result[0][i].isUfm

                                  })
                            }
                         
                       }else{
                         this.snotifyService.success('No Records Found.', 'Success!');
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

   // tslint:disable-next-line:typedef
 isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
   }

goBack(): void{
  this._location.back();
}

  printDform(){ 
    this.router.navigate(['admin-examination-management/admin-pre-examinations/print-Dform'])
    let queryparams = [
        {
         data:this.subjectModerationStudents,
         groupName:this.groupName,
        collegeId:this.examFeeCollectionForm.value.collegeId,
        academicYearId:this.examFeeCollectionForm.value.academicYearId,
        courseId:this.examFeeCollectionForm.value.courseId,
        courseGroupId:this.examFeeCollectionForm.value.courseGroupId,
        courseYearId:this.examFeeCollectionForm.value.courseYearId,
        examId:this.examFeeCollectionForm.value.examId,
        studentId:this.examFeeCollectionForm.value.studentId,
        subjectId:this.examFeeCollectionForm.value.subjectId,
          regulationId:this.examFeeCollectionForm.value.regulationId,
        courseYear:  this.courseYear,
        Logo : this.Logo
        }
      ]
      this.paramaters.dFormData = queryparams;
  }

  printForm(){
    this.router.navigate(['admin-examination-management/admin-pre-examinations/print-form'])
    let queryparams = [
        {
         data:this.subjectModerationStudents,
         groupName:this.groupName,
        collegeId:this.examFeeCollectionForm.value.collegeId,
        academicYearId:this.examFeeCollectionForm.value.academicYearId,
        courseId:this.examFeeCollectionForm.value.courseId,
        courseGroupId:this.examFeeCollectionForm.value.courseGroupId,
        courseYearId:this.examFeeCollectionForm.value.courseYearId,
        examId:this.examFeeCollectionForm.value.examId,
        studentId:this.examFeeCollectionForm.value.studentId,
        subjectId:this.examFeeCollectionForm.value.subjectId,
        regulationId:this.examFeeCollectionForm.value.regulationId,
        courseYear:  this.courseYear,
        Logo : this.Logo
        }
      ]
      console.log(queryparams,'queryparams');
      
      this.paramaters.FormData = queryparams;
  }
  printformA(){ 
    this.router.navigate(['admin-examination-management/admin-pre-examinations/print-formA'])
    let queryparams = [
        {
         data:this.subjectModerationStudents,
         groupName:this.groupName,
        collegeId:this.examFeeCollectionForm.value.collegeId,
        academicYearId:this.examFeeCollectionForm.value.academicYearId,
        courseId:this.examFeeCollectionForm.value.courseId,
        courseGroupId:this.examFeeCollectionForm.value.courseGroupId,
        courseYearId:this.examFeeCollectionForm.value.courseYearId,
        examId:this.examFeeCollectionForm.value.examId,
        studentId:this.examFeeCollectionForm.value.studentId,
        subjectId:this.examFeeCollectionForm.value.subjectId,
        regulationId:this.examFeeCollectionForm.value.regulationId,

        courseYear:  this.courseYear,
        Logo : this.Logo
        }
      ]
      this.paramaters.AFormData = queryparams;
  }


}
