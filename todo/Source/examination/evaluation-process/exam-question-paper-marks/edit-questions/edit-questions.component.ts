import { Component, OnInit, Inject } from '@angular/core';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FloorsModalComponent } from 'app/main/apps/admin/institution-masters/floors/floors-modal/floors-modal.component';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONSTANTS } from 'app/main/common/constants';
@Component({
  selector: 'app-edit-questions',
  templateUrl: './edit-questions.component.html',
  styleUrls: ['./edit-questions.component.scss']
})
export class EditQuestionsComponent implements OnInit {
   editorApiKey = CONSTANTS.editorApiKey;
  public options: Object = {
    height: '350',
    // base_url: '/tinymce', // Root for resources
    // suffix: '.min',        // Suffix to use when loading resources
     
     // Add wiris plugin
     external_plugins: {
         'tiny_mce_wiris' : `https://www.wiris.net/demo/plugins/tiny_mce/plugin.js`
     },
     // This option allows us to introduce mathml formulas
     // We recommend to set 'draggable_modal' to true to avoid overlapping issues
     // with the different UI modal dialog windows implementations between core and third-party plugins on TinyMCE.
     // @see: https://github.com/wiris/html-integrations/issues/134#issuecomment-905448642
     // tiny_mce_wiris_formulaEditor tiny_mce_wiris_formulaEditorChemistry
     plugins: ['link', 'image', 'table', 'textcolor', 'lists'],
     toolbar: 'undo redo | fontselect |  fontsizeselect | bold underline italic | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | lineheight | forecolor backcolor | link image | table | tiny_mce_wiris_formulaEditor tiny_mce_wiris_formulaEditorChemistry',
     table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
     fontsize_formats:
    "8pt 9pt 10pt 11pt 12pt 14pt 18pt 24pt 30pt 36pt 48pt 60pt 72pt 96pt",
    font_family_formats: 'Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; AkrutiKndPadmini=Akpdmi-n',
    draggable_modal: true,
    automatic_uploads: true,
    image_title: true,
    file_picker_types: 'image',
    file_browser_callback :true,
      /* and here's our custom image picker*/
 
    extended_valid_elements: '*[.*]',
     // language: 'fr_FR',
     // You could set a different language for MathType editor:
     // mathTypeParameters: {
     //   editorParameters: { language: 'de' },
     // },
 };
  subjectTypes: GeneralDetail[] = [];
  dialogTitle;
  questionEditForm: FormGroup;
  question: any;
  questionMarks: any;
  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<FloorsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data, public router: Router) {
  }
  ngOnInit(): void {
    this.dialogTitle = 'Edit Question';
    this.questionEditForm = this.formBuilder.group({
      question: [''],
      questionMarks: [0],
      isActive:[]
    });
    // this.questionEditForm.get('question').setValue(this.transform(this.data.question));
    this.questionEditForm.get('question').setValue(this.data.question);
      this.questionEditForm.get('questionMarks').setValue(this.data.questionMarks);
    if (!this.isEmptyObject(this.data)) {
      this.question = this.data.question;
       this.questionMarks = this.data.questionMarks;
      this.dialogTitle = 'Edit Question';
    }
  }

  submit(): void {
    const Obj = this.questionEditForm.value;
    if (this.questionEditForm.invalid) {
      return;
    } else {
      Obj.question=this.question
      Obj.questionMarks = this.questionMarks;
      Obj.isActive = true
      this.dialogRef.close(Obj);
    }
  }

  deleted(): void{
    this.questionEditForm.get('question').setValue('');
    const Obj = this.questionEditForm.value;
    if (this.questionEditForm.invalid) {
     return;
    } else {
      Obj.isActive = false;
    this.dialogRef.close(Obj);
    }
  }

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  transform(value: string): string {
    if (!value) {
      return '';
    }

    value = value.replace(/<[^>]*>/g, '');
    value = value.replace(/&nbsp;/g, ' ');
    return value;
  }
}
