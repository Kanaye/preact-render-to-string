import render from '../src/jsx';
import { h, Component } from 'preact';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

// tag to remove leading whitespace from tagged template literal
function dedent([str]) {
	return str.split( '\n'+str.match(/^\n*(\s+)/)[1] ).join('\n').replace(/(^\n+|\n+\s*$)/g, '');
}

describe('jsx', () => {
	let renderJsx = (jsx, opts) => render(jsx, null, opts).replace(/ {2}/g, '\t');

	it('should render as JSX', () => {
		let rendered = renderJsx(
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		);

		expect(rendered).to.equal(dedent`
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		`);
	});

	it('should not render empty class or style DOM attributes', () => {
		expect(renderJsx(<a b={false} />)).to.equal('<a></a>');
		expect(renderJsx(<a b="" />)).to.equal('<a b=""></a>');
		expect(renderJsx(<a class={false} />)).to.equal('<a></a>');
		expect(renderJsx(<a style={false} />)).to.equal('<a></a>');
		expect(renderJsx(<a class="" />)).to.equal('<a></a>');
		expect(renderJsx(<a style="" />)).to.equal('<a></a>');
	});

	it('should render JSX attributes inline if short enough', () => {
		expect(renderJsx(
			<a b="c">bar</a>
		)).to.equal(dedent`
			<a b="c">bar</a>
		`);

		expect(renderJsx(
			<a b>bar</a>
		)).to.equal(dedent`
			<a b={true}>bar</a>
		`);

		expect(renderJsx(
			<a b={false}>bar</a>
		)).to.equal(dedent`
			<a>bar</a>
		`);

		function F(){}
		expect(renderJsx(
			<F b={false}>bar</F>,
			{ shallow: true, renderRootComponent: false }
		)).to.equal(dedent`
			<F b={false}>bar</F>
		`);
	});

	it('should render JSX attributes as multiline if complex', () => {
		expect(renderJsx(
			<a b={['a','b','c','d']}>bar</a>
		)).to.equal(dedent`
			<a
				b={
					Array [
						"a",
						"b",
						"c",
						"d"
					]
				}
			>
				bar
			</a>
		`);
	});

	it('should skip null and undefined attributes', () => {
		expect(renderJsx(
			<a b={null}>bar</a>
		)).to.equal(`<a>bar</a>`);

		expect(renderJsx(
			<a b={undefined}>bar</a>
		)).to.equal(`<a>bar</a>`);
	});

	it('should render attributes containing VNodes', () => {
		expect(renderJsx(
			<a b={<c />}>bar</a>
		)).to.equal(dedent`
			<a b={<c></c>}>bar</a>
		`);

		expect(renderJsx(
			<a b={[
				<c />,
				<d f="g" />
			]}
			>bar</a>
		)).to.equal(dedent`
			<a
				b={
					Array [
						<c></c>,
						<d f="g"></d>
					]
				}
			>
				bar
			</a>
		`);
	});

	it('should render empty resolved children identically to no children', () => {
		const Empty = () => null;
		const False = () => false;
		expect(renderJsx(
			<div>
				<a />
				<b>{null}</b>
				<c><Empty /></c>
				<d>{false}</d>
				<e><False /></e>
			</div>
		)).to.equal(dedent`
			<div>
				<a></a>
				<b></b>
				<c></c>
				<d></d>
				<e></e>
			</div>
		`);
	});

	it('should skip null siblings', () => {
		expect(renderJsx(
			<jsx>
				<span />
				{null}
			</jsx>
		)).to.deep.equal(dedent`
			<jsx>
				<span></span>
			</jsx>
		`);
	});

	it('should skip functions if functions=false', () => {
		expect(renderJsx(
			<div onClick={() => {}} />,
			{ functions: false }
		)).to.equal('<div></div>');
	});

	it('should skip function names if functionNames=false', () => {
		expect(renderJsx(
			<div onClick={() => {}} />,
			{ functionNames: false }
		)).to.equal('<div onClick={Function}></div>');

		expect(renderJsx(
			<div onClick={function foo(){}} />,
			{ functionNames: false }
		)).to.equal('<div onClick={Function}></div>');
	});

	it('should render self-closing elements', () => {
		expect(renderJsx(
			<meta charset="utf-8" />
		)).to.deep.equal(dedent`
			<meta charset="utf-8" />
		`);
	});

	describe('higher order components', () => {
		class Outer extends Component {
			render({ children, ...props }) {
				return <Inner {...props} a="b">child <span>{ children }</span></Inner>;
			}
		}

		class Inner extends Component {
			render({ children, ...props }) {
				return <div id="inner" {...props} b="c" c="d">{ children }</div>;
			}
		}

		it('should render child inline when shallow=true', () => {
			let rendered = render(<Outer a="a" b="b" p={1}>foo</Outer>, null, { shallow: true });
			expect(rendered).to.equal(dedent`
				<Inner
				  a="b"
				  b="b"
				  p={1}
				>
				  child 
				  <span>foo</span>
				</Inner>
			`);
		});

		it('should render nested high order components when shallowHighOrder=false', () => {
			// using functions for meaningful generation of displayName
			function Outer() { return <Middle />; }
			function Middle() { return <div><Inner /></div>; }
			function Inner() { return 'hi'; }

			let rendered = render(<Outer />);
			expect(rendered).to.equal('<div>hi</div>');

			rendered = render(<Outer />, null, { shallow: true });
			expect(rendered, '{shallow:true}').to.equal('<Middle></Middle>');

			rendered = render(<Outer />, null, { shallow: true, shallowHighOrder: false });
			expect(rendered, '{shallow:true,shallowHighOrder:false}').to.equal(dedent`
				<div>
				  <Inner></Inner>
				</div>
			`, 'but it should never render nested grandchild components');
		});
	});
});
