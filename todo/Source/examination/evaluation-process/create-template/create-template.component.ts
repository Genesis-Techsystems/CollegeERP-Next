import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { jsPDF } from 'jspdf';
import { SnotifyService } from 'ng-snotify';

export interface Question {
  blockId: number,
  parentBlockId: number | null;
  title: string;
  marks: number;
  displayDownText: string;
  displayOrder: number;
  parent: number;
  level: number;
}

export interface Group {
  blockId: number;
  parentBlockId: number | null;
  title: string;
  totalMarks: number;
  minQuestions: number;
  instructions: string;
  displayDownText: string;
  displayOrder: number;
  parent: number;
  level: number;
  totalQuestions: number;
  groups: Group[];
  questions: Question[];
}

export interface Section {
  blockId: number;
  parentBlockId: number | null;
  title: string;
  totalMarks: number;
  minQuestions: number;
  instructions: string;
  displayDownText: string;
  displayOrder: number;
  totalQuestions: number;
  groups: Group[];
  questions: Question[];
}

@Component({
  selector: 'app-create-template',
  templateUrl: './create-template.component.html',
  styleUrls: ['./create-template.component.scss']
})
export class CreateTemplateComponent {
  sections: Section[] = [];
  templateDetails: any;
  templateDetailList:any;
  hierarchicalBlocks:any;
  nextBlockId = 1; // Counter for unique IDs
  templateForm:  FormGroup;
  private addExamQpTemplateAndDetailsUrl = CONSTANTS.addExamQpTemplateAndDetailsUrl;
  private getExamQpTemplateAndDetailsUrl = CONSTANTS.getExamQpTemplateAndDetailsUrl;
  gethierarchicalBlocks: any[];
  params: any = {};
  templateObj: any = {};

 constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
     private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
     private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {
       this.route.queryParams
                .subscribe(params => {
                  console.log(params);
                  this.params = params;
                  //this.getTemplate(params.universityId, params.examQpTemplateId);
                });
   }
   ngOnInit(): void {
   
     this.templateForm = this.formBuilder.group({
      templateTitle: ['', Validators.required],
      totalmarks: ['', [Validators.required, Validators.min(1)]],
      templateDescription: [''],
     });
     this.getTemplateDetails();
    }

  getTemplateDetails(): void{
  
     this.spinner.show();
     /*----------- EMPLOYEE DATA -----------*/
     this.crudService.listByIds(this.getExamQpTemplateAndDetailsUrl,  0, 'examQpTemplateId', )
       .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.success) {
                this.templateDetailList = result.data;
                if (this.params){
                   this.templateObj = this.templateDetailList.filter(x=> (x.examQpTemplateId === +this.params.examQpTemplateId))[0];
                   console.log(this.templateObj); 
                   this.templateForm.patchValue(this.templateObj);
                   this.mapApiToUi(this.templateObj);
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

  mapApiToUi(apiData: any): void {
  this.sections = [];

  // Filter out only sections (levelno = 1)
  const sectionBlocks = apiData.examQpTemplateDetailsDTO.filter((d: any) => d.levelno === 1);

  sectionBlocks.forEach((section: any) => {
    const sectionObj: any = {
      blockId: section.blockId,
      parentBlockId: section.parentBlockId,
      title: section.title,
      examQpTemplateDetailId: section.examQpTemplateDetailId,
      totalMarks: section.totalMarks,
      minQuestions: section.questionsToAnswer || 0,
      instructions: section.instruction,
      displayDownText: section.displaydowntext,
      totalQuestions: section.questionsTotal || 0,
      groups: [],
      questions: []
    };

    // Map groups under this section
    const groupBlocks = apiData.examQpTemplateDetailsDTO.filter(
      (d: any) => d.parentBlockId === section.blockId && d.levelno === 2
    );

    groupBlocks.forEach((group: any) => {
      sectionObj.groups.push({
        blockId: group.blockId,
        parentBlockId: group.parentBlockId,
        title: group.title,
        examQpTemplateDetailId: group.examQpTemplateDetailId,
        totalMarks: group.totalMarks,
        instructions: group.instruction,
        minQuestions: section.questionsToAnswer || 0,
        displayDownText: group.displaydowntext,
        totalQuestions: group.questionsTotal || 0,
        questions: [] // you can later map levelno=3 if present
      });
    });

    this.sections.push(sectionObj);
  });
}  

  generateBlockId(): number {
    return this.nextBlockId++;
  }

  addSection() {
     if (this.templateForm.invalid) {
    // Mark all controls as touched so errors appear
    this.templateForm.markAllAsTouched();
    return;
  }
    const newSection: Section = {
      blockId: this.generateBlockId(),
      parentBlockId: null, // Sections have no parent
      title: `Section ${this.sections.length + 1}`,
      totalMarks: 0,
      minQuestions: 0,
      instructions: '',
      displayDownText: '',
      displayOrder: this.sections.length + 1,
      totalQuestions: 0,
      groups: [],
      questions: []
    };
    this.sections.push(newSection);
  }

  addGroup(parent: Section | Group) {
    const newGroup: Group = {
      blockId: this.generateBlockId(),
      parentBlockId: parent.blockId, // Set the parent ID
      title: `Group ${parent.groups.length + 1}`,
      totalMarks: 0,
      minQuestions: 0,
      instructions: '',
      displayDownText: '',
      displayOrder: parent.groups.length + 1,
      parent: parent.displayOrder,
      level: (parent as any).level + 1 || 1,
      totalQuestions: 0,
      groups: [],
      questions: []
    };
    parent.groups.push(newGroup);
  }

  addQuestion(parent: Section | Group) {
    const newQuestion: Question = {
      blockId: this.generateBlockId(),
      parentBlockId: parent.blockId, // Set the parent ID
      title: `Question ${parent.questions.length + 1}`,
      marks: 0,
      displayDownText: '',
      displayOrder: parent.questions.length + 1,
      parent: parent.displayOrder,
      level: (parent as any).level + 1 || 1
    };
    parent.questions.push(newQuestion);
    this.updateTotalQuestions();
  }

  updateTotalQuestions() {
    this.sections.forEach(section => {
      section.totalQuestions = this.countTotalQuestions(section);
    });
  }

  removeSection(sectionIndex: number) {
    this.sections.splice(sectionIndex, 1);
    this.updateTotalQuestions();
  }

  removeGroup(parent: Section | Group, group: Group) {
    const index = parent.groups.indexOf(group);
    if (index !== -1) {
      parent.groups.splice(index, 1);
      this.updateTotalQuestions();
    }
  }

  removeQuestion(parent: Section | Group, question: Question) {
    const index = parent.questions.indexOf(question);
    if (index !== -1) {
      parent.questions.splice(index, 1);
      this.updateTotalQuestions();
    }
  }

  countTotalQuestions(parent: Section | Group): number {
    let count = parent.questions.length;
    parent.groups.forEach(group => {
      count += this.countTotalQuestions(group);
    });
    return count;
  }

  saveAsJSON() {
    this.templateDetails = this.convertToViewFormat();
    this.hierarchicalBlocks = this.buildHierarchy(this.templateDetails);
    console.log(this.templateDetails, 'Converted Template Details');
    // this.postData();
  }
  get sectionsDetails() {
    return this.templateDetails.filter(item => item.levelno === 1);
  }

  getGroups(parentBlockId: number) {
    return this.templateDetails.filter(item => item.parentBlockId === parentBlockId);
  }

  getQuestions(parentBlockId: number) {
    return this.templateDetails.filter(item => item.parentBlockId === parentBlockId);
  }
  getChildren(parentId: number) {
    return this.templateDetails.filter(x => x.parentBlockId === parentId);
  }

  saveAsPDF() {
    let json = this.templateDetailList[7].examQpTemplateDetailsDTO
    console.log(json,'json')
    this.gethierarchicalBlocks = this.getbuildHierarchy(json);
    // const doc = new jsPDF();
    // doc.text(JSON.stringify(this.sections, null, 2), 10, 10);
    // doc.save('question-paper-template.pdf');
  }

validateTemplate(): boolean {
  let isValid = true;
  let errorMessages: string[] = [];

  // 1) Template total marks must match sum of all section marks
  const formTotalMarks = this.templateForm.get('totalmarks')?.value || 0;
  const sectionsTotalMarks = this.sections.reduce((sum, s) => sum + (Number(s.totalMarks) || 0), 0);

  if (formTotalMarks < sectionsTotalMarks) {
    isValid = false;
    errorMessages.push(`Template total marks (${formTotalMarks}) cannot be less than sum of all sections (${sectionsTotalMarks}).`);
  } else if (formTotalMarks > sectionsTotalMarks) {
    isValid = false;
    errorMessages.push(`Template total marks (${formTotalMarks}) cannot be greater than sum of all sections (${sectionsTotalMarks}).`);
  }

  // 2) If minQuestions = 0 → Sum of groups' marks must equal section total marks
this.sections.forEach((section) => {
  if ((section.minQuestions || 0) === 0 && section.groups && section.groups.length > 0) {
    const sectionMarks = Number(section.totalMarks) || 0;
    const groupsTotalMarks = section.groups.reduce(
      (sum, g) => sum + (Number(g.totalMarks) || 0),
      0
    );

    console.log('Section Marks:', sectionMarks);
    console.log('Groups Total:', groupsTotalMarks);

    if (groupsTotalMarks !== sectionMarks) {
      isValid = false;
      errorMessages.push(
        `In section "${section.title || 'Untitled'}", the sum of all groups' total marks (${groupsTotalMarks}) must equal the section's total marks (${sectionMarks}) when minQuestions is 0.`
      );
    }
  }
});

  // 3) If minQuestions > 0 → All groups must have the same marks (any value, but equal)
  this.sections.forEach((section) => {
    if ((section.minQuestions || 0) > 0 && section.groups && section.groups.length > 0) {
      const firstGroupMarks = section.groups[0].totalMarks;
      const allEqual = section.groups.every(g => g.totalMarks === firstGroupMarks);

      if (!allEqual) {
        isValid = false;
        errorMessages.push(`All groups in section "${section.title || 'Untitled'}" must have the same total marks when minQuestions > 0.`);
      }
    }
  });

  // Show errors if any
  if (!isValid) {
    //alert(errorMessages.join('\n'));
     this.snotifyService.error(errorMessages.join('\n'), 'Error!');
  }

  return isValid;
}

  convertToViewFormat(): any[] {

  if (!this.validateTemplate()) {
    return; // Stop save if invalid
  }

    let templateDetails: any[] = [];
    let questionCounter = 1; // Unique, sequential question numbering
  
    this.sections.forEach((section: any, sectionIndex) => {
      templateDetails.push({
        blockId: section.blockId,
        parentBlockId: section.parentBlockId,
        examQpTemplateDetailId: section.examQpTemplateDetailId,
        qpBlockTypeId: 6046, // Section
        levelno: 1,
        levelOrderNo: sectionIndex + 1,
        title: section.title,
        instruction: section.instructions,
        questionsTotal: section.totalQuestions,
        questionsToAnswer: section.minQuestions,
        totalMarks: section.totalMarks,
        questionNo: null,
        questionNoDisplaytext: null,
        displaydowntext: section.displayDownText,
        isActive: true,
        reason: ""
      });
  
      // Process groups inside the section
      section.groups.forEach((group, groupIndex) => {
        templateDetails.push({
          blockId: group.blockId,
          parentBlockId: group.parentBlockId,
          examQpTemplateDetailId: group.examQpTemplateDetailId,
          qpBlockTypeId: 6046, // Group
          levelno: 2,
          levelOrderNo: groupIndex + 1,
          title: group.title,
          instruction: group.instructions,
          questionsTotal: group.totalQuestions,
          questionsToAnswer: group.minQuestions,
          totalMarks: group.totalMarks,
          questionNo: null,
          questionNoDisplaytext: null,
          displaydowntext: group.displayDownText,
          isActive: true,
          reason: ""
        });
  
        group.questions.forEach((question: any, questionIndex) => {
          console.log(question,'question');
          console.log(questionIndex,'question');
          templateDetails.push({
            blockId: question.blockId,
            parentBlockId: question.parentBlockId,
            examQpTemplateDetailId: question.examQpTemplateDetailId,
            qpBlockTypeId: 6047, // Question
            levelno: 3,
            levelOrderNo: questionIndex + 1,
            title:null,
            instruction: "",
            questionsTotal: null,
            questionsToAnswer: question.minQuestions,
            totalMarks: question.marks,
            questionNo: questionCounter,
            questionNoDisplaytext: `Q${questionCounter++}`,
            displaydowntext: question.displayDownText,
            isActive: true,
            reason: ""
          });
        });
      });
  
      // Process questions directly under the section
      section.questions.forEach((question: any, questionIndex) => {
      

        
        templateDetails.push({
          blockId: question.blockId,
          parentBlockId: question.parentBlockId,
          examQpTemplateDetailId: question.examQpTemplateDetailId,
          qpBlockTypeId: 6047, // Question
          levelno: 2, // Section-level questions
          levelOrderNo: questionIndex + 1,
          title: null,
          instruction: "",
          questionsTotal: null,
          questionsToAnswer: question.minQuestions,
          totalMarks: question.marks,
          questionNo: questionCounter,
          questionNoDisplaytext: `Q${questionCounter++}`,
          displaydowntext: question.displayDownText,
          isActive: true,
          reason: ""
        });
      });
    });
  
    return templateDetails;
  }
  getbuildHierarchy(flatList: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];
  
    // Clear duplicates based on blockId
    const uniqueList = flatList.reduce((acc, current) => {
      if (!acc.some(item => item.blockId === current.blockId)) {
        acc.push(current);
      }
      return acc;
    }, []);
  
    // Create map and assign empty children array
    uniqueList.forEach(item => {
      item.children = [];
      map.set(item.blockId, item);
    });
  
    // Build tree structure
    uniqueList.forEach(item => {
      if (item.parentBlockId && map.has(item.parentBlockId)) {
        map.get(item.parentBlockId).children.push(item);
      } else {
        roots.push(item); // If no parent, it's a root (section)
      }
    });
  
    return roots;
  }
  
  buildHierarchy(blocks: any[]): any[] {
    console.log('hlo');
    
    const map = new Map<number, any>();
    const roots: any[] = [];
  
    blocks.forEach(block => {
      block.children = [];
      map.set(block.blockId, block);
    });
  
    blocks.forEach(block => {
      if (block.parentBlockId) {
        const parent = map.get(block.parentBlockId);
        if (parent) {
          parent.children.push(block);
        }
      } else {
        roots.push(block);
      }
    });
  
    return roots;
  }
  
  saveTemplate(): void {
      this.spinner.show();
      let examQpTemplateId:any = null;
      if (this.params){
        examQpTemplateId = +this.params.examQpTemplateId;
      }
      let payLoad =
      {
        universitiesId: 1,
        templateTitle:this.templateForm.value.templateTitle,
        templateDescription:this.templateForm.value.templateDescription,
        totalmarks:this.templateForm.value.totalmarks,
        templateStatusId:6048,
        isActive:true,
        isLocked: false,
        examQpTemplateId: examQpTemplateId,
        examQpTemplateDetailsDTO : this.templateDetails
      }
      
      this.crudService.add(this.addExamQpTemplateAndDetailsUrl,payLoad
      )
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                      this.snotifyService.success(result.message, 'Success!');
                       this.router.navigate(['admin-examination-management/evaluation-process/create-questionpaper-template'])
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
